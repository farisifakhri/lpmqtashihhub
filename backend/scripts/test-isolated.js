import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'node:child_process';

// Only the uniquely named database created by THIS run may be dropped.
const database = `lpmq_fifo_${Date.now()}_test`;
if (!/^lpmq_fifo_\d+_test$/.test(database)) throw new Error('Invalid disposable database name.');
const source = new URL(process.env.DATABASE_URL);
const target = new URL(source);
target.pathname = `/${database}`;
const db = new PrismaClient();
let created = false;
const env = { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test', SEED_DEFAULT_PASSWORD: 'password123', UPLOAD_DIR: `./storage/test-runs/${database}/uploads` };
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit', shell: false, windowsHide: true });
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
});
try {
  await db.$executeRawUnsafe(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  console.log(`Disposable test database: ${database}`);
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  await run(process.execPath, ['prisma/seed.js']);
  await run(process.execPath, ['tests/queue.integration.js']);
  await run(process.execPath, ['test-api.js']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (created) {
    await db.$executeRawUnsafe(`DROP DATABASE \`${database}\``);
    console.log(`Removed disposable test database: ${database}. Application database was not modified.`);
  }
  await db.$disconnect();
}
