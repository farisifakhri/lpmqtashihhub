import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('scripts/cleanup-perorangan-publishers.js');

test('cleanup-perorangan-publishers: preview mode outputs valid JSON and exits with 0', async () => {
  const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
    cwd: path.resolve('.'),
  });

  assert.ok(!stderr || stderr.trim() === '');
  assert.ok(stdout.includes('[PRATINJAU SAJA]'));
  
  // Extract JSON payload
  const jsonMatch = stdout.match(/\{[\s\S]*?\n\}/);
  assert.ok(jsonMatch, 'Output must include a JSON object with preview stats');
  const payload = JSON.parse(jsonMatch[0]);

  assert.ok('database' in payload);
  assert.ok('total_publishers_before' in payload);
  assert.ok('candidates_count' in payload);
  assert.ok('preserved_publishers' in payload);
  assert.equal(typeof payload.candidates_count, 'number');
  assert.equal(payload.total_publishers_before, payload.candidates_count + payload.preserved_publishers);
});

test('cleanup-perorangan-publishers: execution rejects when --expected count does not match or backup is missing', async () => {
  await assert.rejects(
    async () => {
      await execFileAsync('node', [scriptPath, '--execute', '--expected=999'], {
        cwd: path.resolve('.'),
      });
    },
    /Argumen --expected=999 tidak cocok/
  );
});

test('cleanup-perorangan-publishers: execution rejects when --backup file does not exist', async () => {
  await assert.rejects(
    async () => {
      await execFileAsync('node', [scriptPath, '--execute', '--expected=10', '--backup=non_existent_file.sql'], {
        cwd: path.resolve('.'),
      });
    },
    /Argumen --expected=10 tidak cocok/
  );
});

