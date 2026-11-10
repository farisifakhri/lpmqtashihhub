// Data wilayah administrasi Indonesia (provinsi, kabupaten/kota, kecamatan).
// Sumber: Kepmendagri No 300.2.2-2138 Tahun 2025 (github.com/cahyadsn/wilayah, lisensi MIT),
// disimpan lokal agar formulir publik tidak bergantung pada layanan pihak ketiga.
// Kode berhierarki dengan titik: "32" (provinsi) -> "32.73" (kab/kota) -> "32.73.01" (kecamatan).
import { readFileSync } from 'node:fs';
import { fail } from './workflow-utils.js';

let cache = null;

function load() {
  if (cache) return cache;
  const raw = JSON.parse(readFileSync(new URL('../assets/wilayah/wilayah-indonesia.json', import.meta.url), 'utf8'));
  const toItem = ([kode, nama]) => ({ kode, nama });
  const byCode = new Map();
  const childrenOf = new Map();
  const index = (items) => items.map(toItem).forEach((item) => {
    byCode.set(item.kode, item);
    const parent = item.kode.split('.').slice(0, -1).join('.');
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(item);
    }
  });
  const provinces = raw.provinsi.map(toItem);
  provinces.forEach((item) => byCode.set(item.kode, item));
  index(raw.kabupaten);
  index(raw.kecamatan);
  for (const list of childrenOf.values()) list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  provinces.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  cache = { provinces, byCode, childrenOf };
  return cache;
}

const PROVINCE_RE = /^\d{2}$/;
const REGENCY_RE = /^\d{2}\.\d{2}$/;

export function listProvinces() {
  return load().provinces;
}

export function listRegencies(provinceCode) {
  if (!PROVINCE_RE.test(String(provinceCode || ''))) fail(400, 'Kode provinsi tidak valid.');
  const { byCode, childrenOf } = load();
  if (!byCode.has(provinceCode)) fail(404, 'Provinsi tidak ditemukan.');
  return childrenOf.get(provinceCode) || [];
}

export function listDistricts(regencyCode) {
  if (!REGENCY_RE.test(String(regencyCode || ''))) fail(400, 'Kode kabupaten/kota tidak valid.');
  const { byCode, childrenOf } = load();
  if (!byCode.has(regencyCode)) fail(404, 'Kabupaten/kota tidak ditemukan.');
  return childrenOf.get(regencyCode) || [];
}

/**
 * Pastikan kombinasi provinsi -> kab/kota -> kecamatan konsisten dan kembalikan namanya.
 * Nama disimpan sebagai salinan pada data permohonan agar tetap terbaca bila data wilayah diperbarui.
 */
export function resolveRegion(provinceCode, regencyCode, districtCode) {
  const { byCode } = load();
  const province = byCode.get(provinceCode);
  const regency = byCode.get(regencyCode);
  const district = byCode.get(districtCode);
  if (!province || provinceCode.includes('.')) fail(400, 'Provinsi yang dipilih tidak valid.');
  if (!regency || !regencyCode.startsWith(`${provinceCode}.`) || regencyCode.split('.').length !== 2) {
    fail(400, 'Kabupaten/kota yang dipilih tidak sesuai dengan provinsi.');
  }
  if (!district || !districtCode.startsWith(`${regencyCode}.`) || districtCode.split('.').length !== 3) {
    fail(400, 'Kecamatan yang dipilih tidak sesuai dengan kabupaten/kota.');
  }
  return { province, regency, district };
}
