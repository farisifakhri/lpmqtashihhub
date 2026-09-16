import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const url = new URL(process.env.DATABASE_URL);
if (url.protocol !== 'mysql:') throw new Error('Backup requires MySQL.');
const database = decodeURIComponent(url.pathname.slice(1));
const directory = path.resolve('storage/backups');
await mkdir(directory, { recursive: true });
const target = path.join(directory, `${database}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
const processDump = spawn('mysqldump', [
  '--single-transaction', '--quick', '--routines', '--triggers', '--hex-blob',
  '--no-tablespaces', '--set-gtid-purged=OFF',
  '--host', url.hostname, '--port', url.port || '3306',
  '--user', decodeURIComponent(url.username), '--databases', database,
], { shell: false, windowsHide: true, env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) } });
let stderr = '';
processDump.stderr.on('data', chunk => { stderr += chunk; });
const completion = new Promise((resolve, reject) => {
  processDump.on('error', reject);
  processDump.on('close', code => code === 0 ? resolve() : reject(new Error(`mysqldump failed (${code}). Backup NOT approved for cleanup.`)));
});
await Promise.all([pipeline(processDump.stdout, createWriteStream(target, { flags: 'wx' })), completion]);
if ((await stat(target)).size < 100) throw new Error('Backup is unexpectedly empty.');
const hash = createHash('sha256');
for await (const chunk of createReadStream(target)) hash.update(chunk);
await writeFile(`${target}.json`, JSON.stringify({ database, host: url.hostname, sha256: hash.digest('hex'), completed_at: new Date().toISOString() }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ backup: target, database, completed: true, bytes: (await stat(target)).size, warnings: Boolean(stderr) }));
