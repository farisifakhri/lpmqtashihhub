/**
 * Helper validasi dan normalisasi formulir permohonan naskah baru LPMQ.
 */

export const normalizeWhatsApp = (value) => {
  if (!value) return '';
  let cleaned = value.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('62')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length > 0) {
    cleaned = '+62' + cleaned;
  }
  return cleaned;
};

export const validateWhatsApp = (value) => {
  if (!value || !value.trim()) return null;
  const normalized = normalizeWhatsApp(value);
  const regex = /^\+62[2-9][0-9]{7,12}$/;
  if (!regex.test(normalized)) {
    return 'Format nomor WhatsApp tidak valid. Gunakan format seperti 081234567890 atau +6281234567890 (minimal 10 digit).';
  }
  return null;
};

export const validateEmail = (value) => {
  if (!value || !value.trim()) return null;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(value.trim().toLowerCase())) {
    return 'Format alamat email tidak valid (contoh: pj.mushaf@penerbit.com).';
  }
  return null;
};

export const isValidOplah = (value) => {
  const normalized = String(value ?? '').trim();
  const amount = Number(normalized);
  return normalized !== '' && Number.isInteger(amount) && amount >= 1 && amount <= 10_000_000;
};

export const validateSizeRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { index: 0, field: 'ukuran', message: 'Ukuran (cm) wajib diisi.' };
  }

  for (const [index, row] of rows.entries()) {
    if (typeof row?.ukuran !== 'string' || !row.ukuran.trim()) {
      return {
        index,
        field: 'ukuran',
        message: `Ukuran (cm) pada entri ${index + 1} wajib diisi.`,
      };
    }

    if (!String(row.oplah ?? '').trim()) {
      return {
        index,
        field: 'oplah',
        message: `Oplah pada entri ${index + 1} wajib diisi.`,
      };
    }

    const amount = Number(row.oplah);
    if (!Number.isInteger(amount) || amount < 1) {
      return {
        index,
        field: 'oplah',
        message: `Oplah pada entri ${index + 1} harus berupa bilangan bulat minimal 1.`,
      };
    }

    if (amount > 10_000_000) {
      return {
        index,
        field: 'oplah',
        message: `Oplah pada entri ${index + 1} maksimal 10.000.000 eksemplar.`,
      };
    }
  }

  return null;
};

export const validateHttpsUrl = (value) => {
  if (!value || !value.trim()) return null;

  try {
    const parsedUrl = new URL(value.trim());
    if (parsedUrl.protocol === 'https:') return null;
  } catch {
    return 'Tautan aplikasi harus berupa URL HTTPS yang valid.';
  }

  return 'Tautan aplikasi harus menggunakan protokol HTTPS.';
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const validateSelectedFile = (file, { allowedExtensions, allowedMimes, maxBytes, fieldLabel }) => {
  if (!file) return null;

  if (file.size === 0) {
    return `${fieldLabel} tidak boleh berupa berkas kosong (0 byte).`;
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    const currentMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Ukuran ${fieldLabel} melebihi batas ${maxMb} MB (ukuran berkas Anda: ${currentMb} MB). Harap pilih berkas dengan ukuran maksimal ${maxMb} MB.`;
  }

  const name = file.name.toLowerCase();
  const hasExt = allowedExtensions.some((ext) => name.endsWith(ext.toLowerCase()));
  const hasMime = allowedMimes && file.type ? allowedMimes.includes(file.type) : true;

  if (!hasExt && !hasMime) {
    return `Format berkas ${fieldLabel} tidak didukung. Format yang diizinkan: ${allowedExtensions.join(', ')}.`;
  }

  return null;
};
