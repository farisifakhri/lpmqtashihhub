// Persiapan sebelum seluruh test E2E dijalankan:
// 1. Pastikan backend + database hidup.
// 2. Reset data uji per tahapan (REG-DEMO-*) agar setiap run mulai dari kondisi yang sama.
//    Script ini HANYA menghapus & membuat ulang naskah berawalan REG-DEMO-.
//    Lewati dengan E2E_SKIP_SEED=1.
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_URL } from './support/session.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default async function globalSetup() {
  let health;
  try {
    health = await (await fetch(`${API_URL}/health`)).json();
  } catch {
    throw new Error(`Backend tidak dapat dihubungi di ${API_URL}. Jalankan "npm run dev:backend" terlebih dahulu.`);
  }
  if (health?.database?.status !== 'CONNECTED') {
    throw new Error(`Database backend belum terhubung: ${JSON.stringify(health?.database)}`);
  }

  if (process.env.E2E_SKIP_SEED !== '1') {
    console.log('[e2e] Mereset data uji REG-DEMO-* (seed:demo-stages)...');
    execSync('npm run -s seed:demo-stages', {
      cwd: path.join(root, 'backend'),
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
}
