import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectMime,
  validateApkArchive,
  upload,
  readStoredFile,
} from '../src/services/storage.service.js';
import {
  scanBufferWithClamd,
  executeAntivirusScan,
} from '../src/services/clamav.service.js';
import { ENV } from '../src/config/env.js';

const storageRoot = fileURLToPath(new URL('../../storage/private/', import.meta.url));

/**
 * Helper to construct an in-memory valid ZIP archive buffer
 * conforming to PKZip specification (Local headers, Central Directory, EOCD).
 */
function createZipBuffer(entries) {
  const fileRecords = [];
  const cdRecords = [];
  let offset = 0;

  for (const { name, content } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content || '');

    // Local file header (30 bytes + name)
    const lfh = Buffer.alloc(30 + nameBuf.length);
    lfh.writeUInt32LE(0x04034b50, 0); // signature
    lfh.writeUInt16LE(20, 4); // version needed
    lfh.writeUInt16LE(0, 6); // flags
    lfh.writeUInt16LE(0, 8); // compression: 0 (store)
    lfh.writeUInt16LE(0, 10); // mod time
    lfh.writeUInt16LE(0, 12); // mod date
    lfh.writeUInt32LE(0, 14); // crc32
    lfh.writeUInt32LE(contentBuf.length, 18); // comp size
    lfh.writeUInt32LE(contentBuf.length, 22); // uncomp size
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);
    nameBuf.copy(lfh, 30);

    // Central directory header (46 bytes + name)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // cd signature
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed
    cdh.writeUInt16LE(0, 8); // flags
    cdh.writeUInt16LE(0, 10); // compression
    cdh.writeUInt16LE(0, 12); // time
    cdh.writeUInt16LE(0, 14); // date
    cdh.writeUInt32LE(0, 16); // crc32
    cdh.writeUInt32LE(contentBuf.length, 20);
    cdh.writeUInt32LE(contentBuf.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30); // extra len
    cdh.writeUInt16LE(0, 32); // comment len
    cdh.writeUInt16LE(0, 34); // disk start
    cdh.writeUInt16LE(0, 36); // internal attr
    cdh.writeUInt32LE(0, 38); // external attr
    cdh.writeUInt32LE(offset, 42); // relative offset
    nameBuf.copy(cdh, 46);

    fileRecords.push(lfh, contentBuf);
    cdRecords.push(cdh);
    offset += lfh.length + contentBuf.length;
  }

  const cdBuf = Buffer.concat(cdRecords);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk num
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8); // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...fileRecords, cdBuf, eocd]);
}

/**
 * Starts a mock clamd TCP server simulating the INSTREAM protocol.
 */
function startMockClamdServer(responseGenerator) {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);
      let instreamStarted = false;

      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        if (!instreamStarted) {
          const idx = buffer.indexOf(Buffer.from('zINSTREAM\0'));
          if (idx !== -1) {
            instreamStarted = true;
            buffer = buffer.subarray(idx + 10);
          }
        }

        if (instreamStarted) {
          while (buffer.length >= 4) {
            const chunkSize = buffer.readUInt32BE(0);
            if (chunkSize === 0) {
              const resp = typeof responseGenerator === 'function' ? responseGenerator() : (responseGenerator || 'stream: OK\0');
              socket.write(resp);
              socket.end();
              return;
            }
            if (buffer.length >= 4 + chunkSize) {
              buffer = buffer.subarray(4 + chunkSize);
            } else {
              break;
            }
          }
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test('P1-1: APK validation: .docx is rejected (lacks AndroidManifest.xml)', async () => {
  const docxZip = createZipBuffer([
    { name: '[Content_Types].xml', content: '<?xml version="1.0"?>' },
    { name: '_rels/.rels', content: '<?xml version="1.0"?>' },
    { name: 'word/document.xml', content: '<w:document/>' },
  ]);

  await assert.rejects(
    validateApkArchive(docxZip),
    (err) => err.statusCode === 400 && err.message.includes('AndroidManifest.xml')
  );
});

test('P1-1: APK validation: Fake ZIP with only AndroidManifest.xml is rejected (missing dex or arsc)', async () => {
  const fakeApk = createZipBuffer([
    { name: 'AndroidManifest.xml', content: '<manifest/>' },
    { name: 'assets/data.txt', content: 'dummy' },
  ]);

  await assert.rejects(
    validateApkArchive(fakeApk),
    (err) => err.statusCode === 400 && err.message.includes('classes.dex atau resources.arsc')
  );
});

test('P1-1: APK validation: Directory traversal (../) in ZIP entry is rejected', async () => {
  const maliciousApk = createZipBuffer([
    { name: 'AndroidManifest.xml', content: '<manifest/>' },
    { name: 'classes.dex', content: 'dex' },
    { name: '../lib/arm64/malicious.so', content: 'evil payload' },
  ]);

  await assert.rejects(
    validateApkArchive(maliciousApk),
    (err) => err.statusCode === 400 && err.message.includes('directory traversal')
  );
});

test('P1-1: APK validation: Minimal valid APK is accepted (manifest + classes.dex)', async () => {
  const validApk = createZipBuffer([
    { name: 'AndroidManifest.xml', content: '<manifest package="id.go.kemenag.lpmq"/>' },
    { name: 'classes.dex', content: 'dex\n035\0' },
  ]);

  const result = await validateApkArchive(validApk);
  assert.equal(result.hasManifest, true);
  assert.equal(result.hasDexOrArsc, true);
  assert.equal(result.entryCount, 2);
});

test('P1-1: APK validation: Minimal valid APK with resources.arsc is accepted', async () => {
  const validApk = createZipBuffer([
    { name: 'AndroidManifest.xml', content: '<manifest package="id.go.kemenag.lpmq"/>' },
    { name: 'resources.arsc', content: 'arsc header' },
  ]);

  const result = await validateApkArchive(validApk);
  assert.equal(result.hasManifest, true);
  assert.equal(result.hasDexOrArsc, true);
});

test('P1-1: ClamAV: scanBufferWithClamd detects OK response', async () => {
  const mockServer = await startMockClamdServer('stream: OK\0');
  try {
    const res = await scanBufferWithClamd(Buffer.from('Clean payload'), {
      host: '127.0.0.1',
      port: mockServer.port,
    });
    assert.deepEqual(res, { clean: true });
  } finally {
    await mockServer.close();
  }
});

test('P1-1: ClamAV: scanBufferWithClamd detects malware signature', async () => {
  const mockServer = await startMockClamdServer('stream: Win.Trojan.Generic FOUND\0');
  try {
    const res = await scanBufferWithClamd(Buffer.from('Infected payload'), {
      host: '127.0.0.1',
      port: mockServer.port,
    });
    assert.equal(res.clean, false);
    assert.equal(res.virus, 'Win.Trojan.Generic');
  } finally {
    await mockServer.close();
  }
});

test('P1-1: ClamAV: AV_SCAN_MODE=required rejects upload with 503 when daemon is unreachable', async () => {
  // Use a port where no server is running
  const unreachablePort = 59123;
  await assert.rejects(
    executeAntivirusScan(Buffer.from('test data'), {
      mode: 'required',
      host: '127.0.0.1',
      port: unreachablePort,
      timeoutMs: 1000,
    }),
    (err) => err.statusCode === 503 && err.message.includes('Layanan pemindai keamanan (ClamAV) tidak tersedia')
  );
});

test('P1-1: ClamAV: AV_SCAN_MODE=optional permits upload when daemon is unreachable', async () => {
  const unreachablePort = 59124;
  const res = await executeAntivirusScan(Buffer.from('test data'), {
    mode: 'optional',
    host: '127.0.0.1',
    port: unreachablePort,
    timeoutMs: 1000,
  });
  assert.equal(res.scanned, false);
  assert.equal(res.clean, true);
  assert.equal(res.reason, 'unreachable_optional');
});

test('P1-1: EICAR test string check is labeled as standard test string, not malware scanner', async () => {
  const dummyUser = { id: 'dummy-user-id', roles: ['PENERBIT'] };
  const eicarBytes = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

  // Prefix with PDF header so detectMime recognizes it
  const pdfWithEicar = Buffer.concat([Buffer.from('%PDF-1.4\n'), eicarBytes, Buffer.from('\n%%EOF')]);

  await assert.rejects(
    upload(pdfWithEicar, 'application/pdf', dummyUser),
    (err) => err.statusCode === 400 && err.message.includes('string uji standar antivirus (EICAR)')
  );
});

