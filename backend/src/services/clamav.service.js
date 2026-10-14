import net from 'node:net';
import { ENV } from '../config/env.js';

const CHUNK_SIZE = 64 * 1024; // 64 KB per INSTREAM chunk

/**
 * Scan a Buffer using ClamAV daemon (clamd) via the INSTREAM socket protocol.
 *
 * Protocol details:
 * 1. Connect to clamd via TCP or UNIX domain socket.
 * 2. Send 'zINSTREAM\0'.
 * 3. Stream chunks formatted as: [4-byte big-endian unsigned length][chunk payload].
 * 4. Send 4 zero bytes [0x00, 0x00, 0x00, 0x00] to signal EOF.
 * 5. Read clamd response:
 *    - 'stream: OK' -> Clean
 *    - 'stream: <virusname> FOUND' -> Infected
 *    - 'stream: <message> ERROR' -> Scan error
 *
 * @param {Buffer} bytes
 * @param {Object} [options]
 * @param {string} [options.host]
 * @param {number} [options.port]
 * @param {string} [options.socket]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ clean: boolean, virus?: string }>}
 */
export async function scanBufferWithClamd(bytes, options = {}) {
  const host = options.host || ENV.CLAMAV_HOST || '127.0.0.1';
  const port = options.port || ENV.CLAMAV_PORT || 3310;
  const socketPath = options.socket || ENV.CLAMAV_SOCKET || null;
  const timeoutMs = options.timeoutMs || ENV.CLAMAV_TIMEOUT_MS || 10000;

  return new Promise((resolve, reject) => {
    let socket;
    let finished = false;

    const cleanup = () => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const done = (err, result) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (err) reject(err);
      else resolve(result);
    };

    const connectOpts = socketPath ? { path: socketPath } : { host, port };
    socket = net.connect(connectOpts, () => {
      try {
        // Send null-terminated zINSTREAM command
        socket.write('zINSTREAM\0');

        // Stream chunks
        let offset = 0;
        while (offset < bytes.length) {
          const end = Math.min(offset + CHUNK_SIZE, bytes.length);
          const chunk = bytes.subarray(offset, end);
          const lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32BE(chunk.length, 0);
          socket.write(lenBuf);
          socket.write(chunk);
          offset = end;
        }

        // Send 4 zero bytes (EOF marker)
        socket.write(Buffer.alloc(4));
      } catch (writeErr) {
        done(writeErr);
      }
    });

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => {
      done(new Error(`ClamAV connection timed out after ${timeoutMs}ms`));
    });

    let response = '';
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
    });

    socket.on('end', () => {
      const trimmed = response.trim().replace(/\0+$/, '');
      if (/stream:\s*OK/i.test(trimmed)) {
        done(null, { clean: true });
      } else {
        const foundMatch = trimmed.match(/stream:\s*(.+?)\s+FOUND/i);
        if (foundMatch) {
          done(null, { clean: false, virus: foundMatch[1] });
        } else if (/ERROR/i.test(trimmed)) {
          done(new Error(`ClamAV scan error: ${trimmed}`));
        } else {
          done(new Error(`Unexpected ClamAV response: ${trimmed}`));
        }
      }
    });

    socket.on('error', (err) => {
      done(err);
    });
  });
}

/**
 * Perform malware scan on file buffer according to the configured scan mode.
 *
 * AV_SCAN_MODE options:
 * - 'required': Scanner MUST be running. If unreachable, throws 503 error. If malware found, throws 400.
 * - 'optional': Scanner attempted. If unreachable, logs warning and allows upload. If malware found, returns clean: false.
 * - 'off': Scanner skipped completely.
 *
 * @param {Buffer} bytes
 * @param {Object} [options]
 * @returns {Promise<{ scanned: boolean, clean: boolean, virus?: string, reason?: string }>}
 */
export async function executeAntivirusScan(bytes, options = {}) {
  const mode = (options.mode || ENV.AV_SCAN_MODE || 'optional').toLowerCase();

  if (mode === 'off') {
    return { scanned: false, clean: true, reason: 'disabled' };
  }

  try {
    const result = await scanBufferWithClamd(bytes, options);
    return { scanned: true, ...result };
  } catch (err) {
    if (mode === 'required') {
      const error = new Error('Layanan pemindai keamanan (ClamAV) tidak tersedia. Unggahan ditolak demi keamanan server.');
      error.statusCode = 503;
      error.originalError = err;
      throw error;
    }

    console.warn(`[ClamAV] Scanner unavailable in optional mode (${err.message}). Proceeding without scan.`);
    return { scanned: false, clean: true, reason: 'unreachable_optional' };
  }
}

