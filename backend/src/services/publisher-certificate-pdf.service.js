import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { formatOfficialDocumentNumber } from './document-number.service.js';

const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format tanggal Indonesia baku (contoh: 19 Oktober 2026)
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatIndonesianDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = d.getDate();
  const month = INDONESIAN_MONTHS[d.getMonth()] || 'Oktober';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Render PDF Sertifikat Penerbit Al-Qur'an resmi LPMQ Kemenag RI
 * @param {object} publisherData Data penerbit dan pendaftaran
 * @returns {Promise<Uint8Array>}
 */
export async function renderPublisherCertificatePdf(publisherData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 Portrait

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // 1. Logo Kemenag / LPMQ di bagian atas tengah
  let logoImg;
  try {
    const logoBytes = await readFile(letterheadLogo);
    logoImg = await pdf.embedPng(logoBytes);
  } catch (err) {
    console.warn('[Certificate PDF] Gagal memuat logo fisik:', err.message);
  }

  const pageWidth = 595.28;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2; // ~495

  let y = 790;

  if (logoImg) {
    const logoW = 54;
    const logoH = 50;
    page.drawImage(logoImg, {
      x: (pageWidth - logoW) / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + 12;
  } else {
    y -= 40;
  }

  // Helper untuk teks tengah
  const drawCenteredText = (text, size, fontType, color = rgb(0.1, 0.1, 0.1)) => {
    const textWidth = fontType.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      font: fontType,
      size,
      color,
    });
    y -= size + 5;
  };

  // Kop Lembaga
  drawCenteredText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 11, bold);
  drawCenteredText('LAJNAH PENTASHIHAN MUSHAF AL-QUR\'AN', 11, bold);
  y -= 10;

  // Judul Sertifikat & Nomor Induk Penerbit
  drawCenteredText('Sertifikat Penerbit Al-Qur\'an', 14, bold);
  y -= 2;

  const dateObj = publisherData.decided_at ? new Date(publisherData.decided_at) : (publisherData.created_at ? new Date(publisherData.created_at) : new Date());
  const nomorInduk = publisherData.nomor_induk_penerbit || formatOfficialDocumentNumber('SERTIFIKAT_PENERBIT', 1, dateObj);

  drawCenteredText(`Nomor Induk Penerbit: ${nomorInduk}`, 10.5, bold, rgb(0.2, 0.2, 0.2));
  y -= 14;

  // Kalimat Pengantar
  const introText = 'Lajnah Pentashihan Mushaf Al-Qur\'an Kementerian Agama Republik Indonesia menerbitkan sertifikat penerbit Al-Qur\'an kepada:';
  page.drawText(introText, {
    x: margin,
    y,
    font,
    size: 9,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  // Data Tabel Penerbit
  const labelX = margin;
  const colonX = margin + 145;
  const valueX = margin + 155;
  const maxValueW = contentWidth - 155;

  const fields = [
    { label: 'Nama Penerbit', value: publisherData.name || publisherData.legal_name || '-' },
    { label: 'Alamat Penerbit', value: publisherData.address || '-' },
    { label: 'Nomor Telpon Penerbit', value: publisherData.pic_phone || publisherData.phone || '-' },
    { label: 'Email Penerbit', value: publisherData.email || '-' },
    { label: 'Penanggung Jawab Penerbit', value: publisherData.pic_name || '-' },
    { label: 'NPWP', value: publisherData.npwp || '-' },
    { label: 'NIB', value: publisherData.nib || '-' },
  ];

  for (const item of fields) {
    page.drawText(item.label, { x: labelX, y, font, size: 8.5, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(':', { x: colonX, y, font, size: 8.5, color: rgb(0.15, 0.15, 0.15) });

    // Word wrap jika nilai panjang (terutama alamat)
    const valStr = String(item.value || '-');
    const words = valStr.split(' ');
    let currentLine = '';
    let isFirstLine = true;

    for (const w of words) {
      const candidate = currentLine ? `${currentLine} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, 8.5) > maxValueW) {
        page.drawText(currentLine, { x: valueX, y, font: item.label === 'Nama Penerbit' ? bold : font, size: 8.5, color: rgb(0.1, 0.1, 0.1) });
        y -= 12;
        currentLine = w;
        isFirstLine = false;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: valueX, y, font: item.label === 'Nama Penerbit' ? bold : font, size: 8.5, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
    }
  }

  y -= 8;

  // 5 Butir Ketentuan Resmi
  const terms = [
    'Sertifikat Penerbit Al-Qur\'an merupakan identitas bagi lembaga pemerintah maupun non pemerintah yang melakukan kegiatan dalam bidang pengadaan dan penggandaan Mushaf Al-Qur\'an.',
    'Penerbit Al-Qur\'an wajib mematuhi ketentuan yang berlaku tentang penerbitan, pentashihan, dan peredaran mushaf Al-Qur\'an.',
    'Lajnah Pentashihan Mushaf Al-Qur\'an berwenang untuk melakukan pembinaan dan pengawasan sesuai ketentuan yang berlaku.',
    'Data yang tercantum dalam Sertifikat Penerbit Al-Qur\'an dapat diubah sesuai dengan ketentuan yang berlaku.',
    'Apabila di kemudian hari ternyata terdapat kekeliruan dalam Sertifikat Penerbit Al-Qur\'an ini, maka akan dilakukan perbaikan sebagaimana mestinya.',
  ];

  terms.forEach((term, index) => {
    const num = `${index + 1}.`;
    page.drawText(num, { x: margin + 10, y, font, size: 8, color: rgb(0.15, 0.15, 0.15) });

    const termWords = term.split(' ');
    let lineText = '';
    const termMaxW = contentWidth - 30;

    for (const tw of termWords) {
      const testLine = lineText ? `${lineText} ${tw}` : tw;
      if (font.widthOfTextAtSize(testLine, 8) > termMaxW) {
        page.drawText(lineText, { x: margin + 25, y, font, size: 8, color: rgb(0.15, 0.15, 0.15) });
        y -= 11;
        lineText = tw;
      } else {
        lineText = testLine;
      }
    }
    if (lineText) {
      page.drawText(lineText, { x: margin + 25, y, font, size: 8, color: rgb(0.15, 0.15, 0.15) });
      y -= 13;
    }
  });

  y -= 12;

  // Tanggal Penetapan Bahasa Indonesia
  const indonesianDate = formatIndonesianDate(dateObj);
  page.drawText(`Ditetapkan tanggal: ${indonesianDate}`, {
    x: margin,
    y,
    font,
    size: 8.5,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Blok Tanda Tangan Resmi & QR Code (Kanan Bawah)
  const signRightX = pageWidth - margin - 190;
  let signY = y;

  page.drawText('Kepala Lajnah Pentashihan Mushaf Al-Qur\'an,', {
    x: signRightX,
    y: signY,
    font: bold,
    size: 8,
    color: rgb(0.1, 0.1, 0.1),
  });
  signY -= 12;

  // QR Code Keaslian Dokumen & Alamat URL
  const qrPayload = 'https://tashih.kemenag.go.id/verifikasi/sertifikat/' + encodeURIComponent(nomorInduk);
  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 120,
      errorCorrectionLevel: 'M',
    });
    const qrImg = await pdf.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
    page.drawImage(qrImg, {
      x: signRightX + 25,
      y: signY - 48,
      width: 46,
      height: 46,
    });
  } catch (err) {
    console.warn('[Certificate PDF] Gagal membuat QR Code:', err.message);
  }

  signY -= 54;

  const defaultSignerName = 'H. Abdul Aziz Sidqi, M.Ag.';
  const defaultSignerNip = '197106061998031006';

  page.drawText(defaultSignerName, {
    x: signRightX,
    y: signY,
    font: bold,
    size: 8.5,
    color: rgb(0.1, 0.1, 0.1),
  });
  signY -= 10;

  page.drawText(`NIP. ${defaultSignerNip}`, {
    x: signRightX,
    y: signY,
    font,
    size: 7.5,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Teks Alamat URL QR Sertifikat
  page.drawText('Alamat Verifikasi Dokumen: ' + qrPayload, {
    x: margin,
    y: 39,
    font,
    size: 6.5,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Footer Kemenag
  page.drawText('Dokumen ini sah dan diterbitkan secara elektronik oleh Sistem Informasi Layanan Pentashihan Mushaf Al-Qur\'an.', {
    x: margin,
    y: 28,
    font: italic,
    size: 7,
    color: rgb(0.4, 0.4, 0.4),
  });

  return pdf.save();
}

