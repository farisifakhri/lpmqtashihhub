import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

function safeText(value, font) {
  const text = String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
  for (const character of text) {
    try {
      font.encodeText(character);
    } catch {
      return text.replace(/[^\x00-\x7F]/g, '');
    }
  }
  return text;
}

/**
 * Menggambar Kop Surat Resmi Kementerian Agama RI dengan tulisan di tengah (Centered)
 */
export function drawCenteredKop(page, logo, font, bold, width, margin) {
  if (logo) {
    page.drawImage(logo, { x: margin, y: 744, width: 54, height: 50 });
  }

  const lines = [
    { text: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', font: bold, size: 12 },
    { text: "LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN", font: bold, size: 12 },
    { text: "Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I Jakarta Timur 13560", font, size: 8 },
    { text: 'Telp: (021) 87798807, 8416466, 8416467, 8416468 Fax: (021) 87798807', font, size: 8 },
    { text: 'Website: http://lajnah.kemenag.go.id Email : lajnah@kemenag.go.id', font, size: 8 },
  ];

  let currentY = 786;
  for (const item of lines) {
    const textW = item.font.widthOfTextAtSize(item.text, item.size);
    page.drawText(item.text, {
      x: (width - textW) / 2,
      y: currentY,
      font: item.font,
      size: item.size,
      color: rgb(0.08, 0.08, 0.08),
    });
    currentY -= item.size === 12 ? 14 : 11;
  }

  const lineY = 728;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: width - margin, y: lineY },
    thickness: 1.8,
    color: rgb(0.08, 0.08, 0.08),
  });

  return lineY - 18;
}

export async function renderRegistrationReceiptPdf(reg) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(letterheadLogo));

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2; // 505.28

  const black = rgb(0.08, 0.08, 0.08);
  const darkGreen = rgb(0.05, 0.32, 0.22);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const tableBorder = rgb(0.2, 0.2, 0.2);

  const meta = reg.foreign_metadata || {};
  const publisherName = reg.publisher?.legal_name || reg.publisher?.name || 'PT. CORDOBA INTERNASIONAL INDONESIA';
  const publisherId = reg.publisher?.id ? String(reg.publisher.id).slice(0, 8) : '2019116';
  const regNo = reg.registration_no || '122/2026';
  const title = reg.title || "Al-Qur'an Tajwid Praktis";
  const pjNama = meta.penanggung_jawab_produk || reg.publisher?.name || 'Usman el-Qurthuby';
  const sizes = meta.sizes || [];
  const sizeStr = sizes.length > 0 ? (sizes[0].ukuran || '21,0 x 29,7') : (meta.ukuran || '21,0 x 29,7');
  const oplahNum = sizes.length > 0 ? (sizes[0].oplah || 10000) : (meta.oplah || 10000);
  const oplahStr = Number(oplahNum).toLocaleString('id-ID');

  const jenisNaskahRaw = meta.jenis_naskah;
  const jenisNaskahStr = Array.isArray(jenisNaskahRaw)
    ? jenisNaskahRaw.map((j, i) => `${i + 1}. ${j}`).join(', ')
    : (jenisNaskahRaw || "1. Al-Qur'an 30 Juz, 2. Audio/Visual, 3. Kode Tajwid, 3. Tajwid Warna, 3. Waqaf Ibtida'");

  const jenisMushaf = meta.jenis_mushaf || 'Mushaf Standar Usmani';
  const percetakan = meta.nama_percetakan || 'PT. Gramedia Printing';
  const deskripsi = meta.deskripsi_mushaf || reg.description || "Al-Qur'an mushaf dengan panduan waqaf ibtida-jeda, panduan kode tajwid praktis disertai pembahasan materi tajwid praktis.";

  const categoryLabel = reg.registration_category === 'EXTENSION'
    ? 'Perpanjangan Surat Tanda Tashih'
    : reg.registration_category === 'FOREIGN_MANUSCRIPT'
    ? 'Tanda tashih mushaf luar negeri'
    : 'Tanda tashih mushaf baru';

  const dateIndo = new Date(reg.created_at || Date.now()).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  // Helper baris teks titik dua rata kiri
  const drawColonRow = (page, yPos, labelText, valueText, colWidth = 190) => {
    page.drawText(safeText(labelText, bold), {
      x: margin,
      y: yPos,
      font: font,
      size: 8.5,
      color: black,
    });
    page.drawText(':', {
      x: margin + colWidth,
      y: yPos,
      font: font,
      size: 8.5,
      color: black,
    });

    const maxValW = contentWidth - colWidth - 15;
    const words = String(valueText || '-').split(' ');
    let line = '';
    let curY = yPos;

    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, 8.5) > maxValW && line) {
        page.drawText(safeText(line, font), {
          x: margin + colWidth + 12,
          y: curY,
          font: font,
          size: 8.5,
          color: black,
        });
        curY -= 11.5;
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(safeText(line, font), {
        x: margin + colWidth + 12,
        y: curY,
        font: font,
        size: 8.5,
        color: black,
      });
    }
    return curY - 13;
  };

  // ==========================================
  // HALAMAN 1: Bukti Pendaftaran Mushaf Al-Qur'an
  // ==========================================
  const page1 = pdf.addPage([pageWidth, pageHeight]);
  let y = drawCenteredKop(page1, logo, font, bold, pageWidth, margin);

  // Judul Dokumen (Centered)
  const docTitle = "Bukti Pendaftaran Mushaf Al-Qur'an";
  page1.drawText(docTitle, {
    x: (pageWidth - bold.widthOfTextAtSize(docTitle, 11)) / 2,
    y: y,
    font: bold,
    size: 11,
    color: black,
  });
  y -= 24;

  y = drawColonRow(page1, y, 'Nomor Pendaftaran mushaf', regNo, 190);
  y = drawColonRow(page1, y, 'Jenis Pendaftaran mushaf', categoryLabel, 190);
  y -= 8;

  // I. Informasi Data Mushaf
  page1.drawText('I. Informasi Data Mushaf', {
    x: margin,
    y: y,
    font: bold,
    size: 9.5,
    color: black,
  });
  y -= 14;

  y = drawColonRow(page1, y, 'Nama Penerbit', publisherName, 190);
  y = drawColonRow(page1, y, 'ID Penerbit', publisherId, 190);
  y = drawColonRow(page1, y, 'Nama Produk/Mushaf', title, 190);
  y = drawColonRow(page1, y, 'Nama Penanggung Jawab Produk/Mushaf', pjNama, 190);
  y = drawColonRow(page1, y, 'Ukuran', sizeStr, 190);
  y = drawColonRow(page1, y, 'Oplah', oplahStr, 190);
  y = drawColonRow(page1, y, 'Jenis Naskah', jenisNaskahStr, 190);
  y = drawColonRow(page1, y, 'Jenis Mushaf', jenisMushaf, 190);
  y = drawColonRow(page1, y, 'Nama Percetakan', percetakan, 190);
  y = drawColonRow(page1, y, 'Deskripsi Mushaf', deskripsi, 190);
  y -= 8;

  // II. Informasi Data Materi Tambahan pada Mushaf
  page1.drawText('II. Informasi Data Materi Tambahan pada Mushaf', {
    x: margin,
    y: y,
    font: bold,
    size: 9.5,
    color: black,
  });
  y -= 14;

  const materiTambahanStr = Array.isArray(meta.materi_tambahan) && meta.materi_tambahan.length > 0
    ? meta.materi_tambahan.join(', ')
    : '-';
  y = drawColonRow(page1, y, 'Materi tambahan pada mushaf', materiTambahanStr, 190);
  y = drawColonRow(page1, y, 'Penanggung Jawab materi tambahan', meta.penanggung_jawab_materi || '-', 190);
  y -= 8;

  // III. Informasi Dokumen Mushaf
  page1.drawText('III. Informasi Dokumen Mushaf', {
    x: margin,
    y: y,
    font: bold,
    size: 9.5,
    color: black,
  });
  y -= 14;

  const baseUrl = 'https://tashih.kemenag.go.id/uploads/proses_pentashihan';
  y = drawColonRow(page1, y, 'Surat Permohonan Tanda tashih mushaf baru *', `${baseUrl}/permohonan-${regNo.replace(/[^a-zA-Z0-9]/g, '') || 'dok'}.pdf`, 190);
  y = drawColonRow(page1, y, 'Gambar cover mushaf *', `${baseUrl}/cover-${regNo.replace(/[^a-zA-Z0-9]/g, '') || 'dok'}.jpg`, 190);
  y = drawColonRow(page1, y, 'Gambar dokumen naskah *', `${baseUrl}/naskah-${regNo.replace(/[^a-zA-Z0-9]/g, '') || 'dok'}.jpg`, 190);
  y = drawColonRow(page1, y, 'Apakah Sudah dilakukan Tashih Internal? *', 'Sudah', 190);
  y = drawColonRow(page1, y, 'Bukti Tashih Internal', `${baseUrl}/tashih-internal-${regNo.replace(/[^a-zA-Z0-9]/g, '') || 'dok'}.pdf`, 190);

  // ==========================================
  // HALAMAN 2: Pernyataan Penerbit & Berita Acara Verifikasi
  // ==========================================
  const page2 = pdf.addPage([pageWidth, pageHeight]);
  y = pageHeight - 50;

  // Pernyataan Penerbit
  const pernyataan = `Dengan ini penerbit menyatakan bahwa data-data yang tertera pada BUKTI PENDAFTARAN ${categoryLabel} ini adalah benar. Jika data yang diisikan ternyata tidak benar, terbukti palsu, dan atau ternyata tidak memenuhi persyaratan maka LPMQ dapat membatalkan proses pentashihan dan atau mencabut Tanda Tashih mushaf yang didaftarkan ini.`;
  
  const wordsPernyataan = pernyataan.split(' ');
  let pBuf = '';
  for (const w of wordsPernyataan) {
    const candidate = pBuf ? `${pBuf} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, 8.5) > contentWidth) {
      page2.drawText(safeText(pBuf, font), { x: margin, y, font, size: 8.5, color: black });
      y -= 12;
      pBuf = w;
    } else {
      pBuf = candidate;
    }
  }
  if (pBuf) {
    page2.drawText(safeText(pBuf, font), { x: margin, y, font, size: 8.5, color: black });
    y -= 16;
  }

  page2.drawText(dateIndo, { x: margin, y, font, size: 8.5, color: black });
  y -= 45;
  page2.drawText('(..................................................................................)', { x: margin, y, font, size: 8.5, color: black });
  y -= 12;
  page2.drawText('Tandatangani, nama jelas dan stempel penerbit', { x: margin, y, font: bold, size: 8, color: black });
  y -= 25;

  // Garis Pembatas
  page2.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.2,
    color: black,
  });
  y -= 20;

  // Judul Berita Acara
  const baHeader1 = 'BERITA ACARA VERIFIKASI NASKAH MASTER (DIISI OLEH PENTASHIH LPMQ)';
  page2.drawText(baHeader1, {
    x: (pageWidth - bold.widthOfTextAtSize(baHeader1, 9)) / 2,
    y: y,
    font: bold,
    size: 9,
    color: black,
  });
  y -= 22;

  const baHeader2 = 'BERITA ACARA';
  const baHeader3 = 'HASIL VERIFIKASI NASKAH MASTER';
  page2.drawText(baHeader2, {
    x: (pageWidth - bold.widthOfTextAtSize(baHeader2, 10)) / 2,
    y: y,
    font: bold,
    size: 10,
    color: black,
  });
  y -= 13;
  page2.drawText(baHeader3, {
    x: (pageWidth - bold.widthOfTextAtSize(baHeader3, 10)) / 2,
    y: y,
    font: bold,
    size: 10,
    color: black,
  });
  y -= 18;

  const introBa = "Pada hari ini ……….………., tanggal……….bulan……….………. tahun………. telah dilaksanakan pemeriksaan dan telaah terhadap naskah master Mushaf Al-Qur'an sebagai berikut:";
  page2.drawText(introBa, { x: margin, y, font, size: 8, color: black });
  y -= 16;

  y = drawColonRow(page2, y, 'Nama Penerbit', publisherName, 180);
  y = drawColonRow(page2, y, 'ID Penerbit', publisherId, 180);
  y = drawColonRow(page2, y, 'Nama Produk/Mushaf', title, 180);
  y = drawColonRow(page2, y, 'Nomor pendaftaran mushaf', regNo, 180);
  y = drawColonRow(page2, y, 'Jenis pendaftaran mushaf', categoryLabel, 180);
  y -= 8;

  page2.drawText('Dengan hasil pemeriksaan dan telaah sebagai berikut:', { x: margin, y, font, size: 8.5, color: black });
  y -= 12;

  // Tabel 8 Poin Pemeriksaan
  const checklistRows = [
    ['1.', 'Kelengkapan Juz'],
    ['2.', 'Kelengkapan Surah'],
    ['3.', 'Urutan Halaman'],
    ['4.', 'Kesesuaian Dengan Kaidah Penulisan Mushaf Standar Indonesia'],
    ['5.', 'Kesuaian dengan kaidah tajwid warna'],
    ['6.', 'Kesesuaian dengan terjemah kemenag'],
    ['7.', "Kesesuaian dengan pedoman penulisan Al-Qur'an Braille Kemenag."],
    ['8.', 'Kesesuaian Dengan Pedoman Transliterasi'],
  ];

  const col1W = 28;
  const col2W = 310;
  const col3W = 55;
  const col4W = contentWidth - col1W - col2W - col3W; // ~112
  const thH = 18;

  // Header Tabel
  page2.drawRectangle({
    x: margin,
    y: y - thH,
    width: contentWidth,
    height: thH,
    borderColor: tableBorder,
    borderWidth: 0.8,
  });
  page2.drawText('No', { x: margin + 6, y: y - 12, font: bold, size: 8, color: black });
  page2.drawText('Jenis Pemeriksaan', { x: margin + col1W + 6, y: y - 12, font: bold, size: 8, color: black });
  page2.drawText('Ceklis', { x: margin + col1W + col2W + 10, y: y - 12, font: bold, size: 8, color: black });
  page2.drawText('Keterangan', { x: margin + col1W + col2W + col3W + 10, y: y - 12, font: bold, size: 8, color: black });
  y -= thH;

  for (const [no, label] of checklistRows) {
    const rowH = 17;
    page2.drawRectangle({
      x: margin,
      y: y - rowH,
      width: contentWidth,
      height: rowH,
      borderColor: tableBorder,
      borderWidth: 0.5,
    });
    // Garis vertikal
    page2.drawLine({ start: { x: margin + col1W, y }, end: { x: margin + col1W, y: y - rowH }, thickness: 0.5, color: tableBorder });
    page2.drawLine({ start: { x: margin + col1W + col2W, y }, end: { x: margin + col1W + col2W, y: y - rowH }, thickness: 0.5, color: tableBorder });
    page2.drawLine({ start: { x: margin + col1W + col2W + col3W, y }, end: { x: margin + col1W + col2W + col3W, y: y - rowH }, thickness: 0.5, color: tableBorder });

    page2.drawText(no, { x: margin + 6, y: y - 12, font, size: 8, color: black });
    page2.drawText(safeText(label, font), { x: margin + col1W + 6, y: y - 12, font, size: 8, color: black });
    y -= rowH;
  }

  y -= 14;
  page2.drawText('Naskah tersebut dinyatakan', { x: margin, y, font: bold, size: 8.5, color: black });
  y -= 14;
  page2.drawText('[   ]  Lolos verifikasi           [   ]  Tidak lolos verifikasi', { x: margin, y, font, size: 8.5, color: black });

  // ==========================================
  // HALAMAN 3: Rencana Tindak Lanjut & PNBP
  // ==========================================
  const page3 = pdf.addPage([pageWidth, pageHeight]);
  y = pageHeight - 50;

  page3.drawText("Rencana tindak lanjut Pelayanan Pentashihan Mushaf Al-Qur'an sebagai berikut:", {
    x: margin,
    y: y,
    font: bold,
    size: 8.5,
    color: black,
  });
  y -= 14;

  page3.drawText('[   ] Dikembalikan ke penerbit', { x: margin, y, font, size: 8.5, color: black });
  y -= 13;
  page3.drawText('[   ] Dilakukan pentashihan dengan ketentuan sebagai berikut:', { x: margin, y, font, size: 8.5, color: black });
  y -= 14;

  page3.drawText('Waktu Layanan Pentashihan : ..... hari kerja', { x: margin + 20, y, font, size: 8, color: black });
  y -= 12;
  page3.drawText('Jumlah Surat Tanda Tashih : ..... Surat Tanda Tashih', { x: margin + 20, y, font, size: 8, color: black });
  y -= 12;
  page3.drawText('Ketentuan PNBP layanan pentashihan sebagai berikut:', { x: margin + 20, y, font, size: 8, color: black });
  y -= 14;

  for (let i = 0; i < 6; i++) {
    page3.drawText('PNBP Konten .................................................................. : Rp .............................................................', {
      x: margin + 20,
      y,
      font,
      size: 8,
      color: black,
    });
    y -= 12;
  }

  page3.drawLine({
    start: { x: margin + 20, y },
    end: { x: pageWidth - margin - 20, y },
    thickness: 0.8,
    color: tableBorder,
  });
  y -= 14;

  page3.drawText('Total Biaya PNBP                                                   : Rp .......................................  per surat tanda tashih', {
    x: margin + 20,
    y,
    font: bold,
    size: 8,
    color: black,
  });
  y -= 25;

  page3.drawText('Demikian Berita Acara ini dibuat agar dapat dipergunakan sebagaimana mestinya.', {
    x: margin,
    y,
    font,
    size: 8.5,
    color: black,
  });
  y -= 20;

  page3.drawText('Jakarta, ……………………….,.................................', { x: margin, y, font, size: 8.5, color: black });
  y -= 12;
  page3.drawText('Mengetahui :', { x: margin, y, font: bold, size: 8.5, color: black });
  y -= 12;
  page3.drawText('Verifikator', { x: margin, y, font: bold, size: 8.5, color: black });
  y -= 45;
  page3.drawText('(                                                                          )', { x: margin, y, font, size: 8.5, color: black });
  y -= 12;
  page3.drawText('Nip. ', { x: margin, y, font, size: 8.5, color: black });
  y -= 30;

  // Peringatan Wajib Lampiran
  page3.drawText("* BUKTI PENDAFTARAN MUSHAF AL-QUR'AN INI WAJIB DILAMPIRKAN KETIKA MENGIRIM", {
    x: margin,
    y,
    font: bold,
    size: 8,
    color: black,
  });
  y -= 11;
  page3.drawText("  NASKAH FISIK MUSHAF AL-QUR'AN YANG TELAH DIDAFTARKAN.", {
    x: margin,
    y,
    font: bold,
    size: 8,
    color: black,
  });

  // QR Code TTE Verifikasi di kanan bawah
  const qrDataUrl = await QRCode.toDataURL(
    `https://tashih.kemenag.go.id/verify/${reg.registration_no || ''}`,
    { errorCorrectionLevel: 'M', margin: 1, width: 160 }
  );
  const qrImage = await pdf.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));

  const qrBoxX = pageWidth - margin - 150;
  page3.drawImage(qrImage, {
    x: qrBoxX + 45,
    y: 80,
    width: 60,
    height: 60,
  });
  page3.drawText('Validasi Pendaftaran Resmi', {
    x: qrBoxX + 25,
    y: 70,
    font: bold,
    size: 7.5,
    color: darkGreen,
  });
  page3.drawText('Kemenag RI — LPMQ Hub', {
    x: qrBoxX + 32,
    y: 60,
    font: italic,
    size: 7,
    color: darkGray,
  });

  return Buffer.from(await pdf.save());
}

/**
 * Menggambar Label Pengiriman Master Fisik Naskah ke LPMQ (Sesuai Halaman 4 Dokumen Resmi)
 */
export async function renderShippingLabelPdf(reg) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let logoImage = null;
  try {
    const logoBytes = await readFile(letterheadLogo);
    logoImage = await pdf.embedPng(logoBytes);
  } catch {
    // optional logo fallback
  }

  const pageWidth = 595;
  const pageHeight = 842;
  const page = pdf.addPage([pageWidth, pageHeight]);

  const margin = 40;
  const labelWidth = pageWidth - 2 * margin; // 515
  const labelTopY = pageHeight - 50; // 792
  const labelHeight = 380;
  const labelBottomY = labelTopY - labelHeight; // 412

  const black = rgb(0.1, 0.1, 0.1);
  const headerBg = rgb(0.96, 0.97, 0.98);

  // Outer border box (label container)
  page.drawRectangle({
    x: margin,
    y: labelBottomY,
    width: labelWidth,
    height: labelHeight,
    borderWidth: 2,
    borderColor: black,
    color: rgb(1, 1, 1),
  });

  // Header Logo & Text inside label
  if (logoImage) {
    page.drawImage(logoImage, {
      x: margin + 15,
      y: labelTopY - 55,
      width: 48,
      height: 44,
    });
  }

  const h1 = 'SISTEM INFORMASI LAYANAN TASHIH';
  const h2 = 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
  const h3 = "Pengiriman Berkas Pendaftaran Mushaf Al-Qur'an";

  page.drawText(h1, {
    x: (pageWidth - bold.widthOfTextAtSize(h1, 11)) / 2,
    y: labelTopY - 22,
    font: bold,
    size: 11,
    color: black,
  });
  page.drawText(h2, {
    x: (pageWidth - bold.widthOfTextAtSize(h2, 11)) / 2,
    y: labelTopY - 36,
    font: bold,
    size: 11,
    color: black,
  });
  page.drawText(h3, {
    x: (pageWidth - bold.widthOfTextAtSize(h3, 10)) / 2,
    y: labelTopY - 54,
    font: bold,
    size: 10,
    color: rgb(0.08, 0.38, 0.28),
  });

  // Garis bawah header label
  let curY = labelTopY - 66;
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: margin + labelWidth, y: curY },
    thickness: 1.5,
    color: black,
  });

  // Extract real data
  const meta = reg.foreign_metadata || {};
  const publisher = reg.publisher || {};
  const regNo = reg.registration_no || 'REG-PENDING';
  const namaMushaf = reg.title || meta.nama_mushaf || meta.judul_mushaf || "Mushaf Al-Qur'an Standar Indonesia";
  const publisherName = publisher.legal_name || publisher.brand_name || publisher.name || meta.nama_penerbit || meta.nama_pemohon || 'Penerbit Terdaftar';
  const publisherAddress = publisher.address || publisher.legal_address || meta.alamat_penerbit || meta.alamat || 'Alamat Kantor Penerbit';
  const pjNama = meta.penanggung_jawab_produk || meta.nama_pj || meta.contact_person || publisher.legal_name || 'Penanggung Jawab Produk';
  const pjWa = meta.penanggung_jawab_wa || meta.no_telp || meta.no_wa || meta.telepon || publisher.phone || publisher.contact_phone || '-';
  const volumeCount = reg.physical_master_intake?.volume_count || reg.physical_volume_count || (reg.physical_master?.volume_count) || 30;
  const jenisMushaf = reg.service_type?.name || meta.jenis_mushaf || "Mushaf Al-Qur'an Standar Usmani";
  const kategori = reg.service_type?.category?.name || meta.kategori_pendaftaran || reg.registration_category || 'Tanda Tashih Baru';

  const col1W = 100;
  const col2W = labelWidth - col1W;

  // Row 1: Penerima (Height ~ 85)
  const row1H = 85;
  const row1Y = curY - row1H;
  page.drawRectangle({
    x: margin,
    y: row1Y,
    width: col1W,
    height: row1H,
    color: headerBg,
    borderColor: black,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + col1W,
    y: row1Y,
    width: col2W,
    height: row1H,
    color: rgb(1, 1, 1),
    borderColor: black,
    borderWidth: 1,
  });
  page.drawText('Penerima', { x: margin + 12, y: curY - 20, font: bold, size: 9, color: black });

  let textY = curY - 18;
  page.drawText("Lajnah Pentashihan Mushaf Al-Qur'an Kementerian Agama Republik Indonesia", { x: margin + col1W + 12, y: textY, font: bold, size: 8, color: black });
  textY -= 14;
  page.drawText('Layanan Permohonan Tanda Tashih', { x: margin + col1W + 12, y: textY, font, size: 8, color: black });
  textY -= 14;
  page.drawText("Gedung Bayt Al-Qur'an & Museum Istiqlal Jalan Raya TMII Pintu I Jakarta Timur 13560", { x: margin + col1W + 12, y: textY, font, size: 8, color: black });
  textY -= 14;
  page.drawText('Telp: (021) 8416468 - 8416466', { x: margin + col1W + 12, y: textY, font, size: 8, color: black });

  curY = row1Y;

  // Row 2: Pengirim (Height ~ 75)
  const row2H = 75;
  const row2Y = curY - row2H;
  page.drawRectangle({
    x: margin,
    y: row2Y,
    width: col1W,
    height: row2H,
    color: headerBg,
    borderColor: black,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + col1W,
    y: row2Y,
    width: col2W,
    height: row2H,
    color: rgb(1, 1, 1),
    borderColor: black,
    borderWidth: 1,
  });
  page.drawText('Pengirim', { x: margin + 12, y: curY - 20, font: bold, size: 9, color: black });

  textY = curY - 18;
  page.drawText(safeText(publisherName.toUpperCase(), bold).slice(0, 55), { x: margin + col1W + 12, y: textY, font: bold, size: 8.5, color: black });
  textY -= 14;
  page.drawText(safeText(publisherAddress, font).slice(0, 75), { x: margin + col1W + 12, y: textY, font, size: 8, color: black });
  textY -= 14;
  const contactLine = `U.p. ${safeText(pjNama, font)}  |  Telp/WA: ${safeText(pjWa, bold)}`;
  page.drawText(contactLine.slice(0, 70), { x: margin + col1W + 12, y: textY, font, size: 8, color: black });

  curY = row2Y;

  // Row 3: Detail Barang (Height ~ 120)
  const row3H = 120;
  const row3Y = curY - row3H;
  page.drawRectangle({
    x: margin,
    y: row3Y,
    width: col1W,
    height: row3H,
    color: headerBg,
    borderColor: black,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + col1W,
    y: row3Y,
    width: col2W,
    height: row3H,
    color: rgb(1, 1, 1),
    borderColor: black,
    borderWidth: 1,
  });
  page.drawText('Detail barang', { x: margin + 12, y: curY - 20, font: bold, size: 9, color: black });

  textY = curY - 18;
  page.drawText("Mushaf Al-Qur'an", { x: margin + col1W + 12, y: textY, font: bold, size: 8.5, color: black });
  textY -= 16;
  page.drawText(`No. Pendaftaran: ${safeText(regNo, bold)}`, { x: margin + col1W + 12, y: textY, font: bold, size: 8.5, color: black });
  textY -= 16;
  page.drawText(`Nama mushaf: ${safeText(namaMushaf, font)}`.slice(0, 65), { x: margin + col1W + 12, y: textY, font, size: 8, color: black });
  textY -= 16;
  page.drawText(`Jenis & Kategori: ${safeText(jenisMushaf, font)} (${safeText(kategori, font)})`.slice(0, 65), { x: margin + col1W + 12, y: textY, font, size: 8, color: black });
  textY -= 16;
  page.drawText(`Jumlah: ${volumeCount} Jilid (Master Naskah Fisik A4 per juz)`, { x: margin + col1W + 12, y: textY, font: bold, size: 8.5, color: rgb(0.08, 0.38, 0.28) });

  // Footer inside box
  const boxFooterY = labelBottomY + 12;
  page.drawText('* Tempelkan label ini secara jelas pada bagian luar kardus atau paket pengiriman fisik naskah.', {
    x: margin + 12,
    y: boxFooterY,
    font: italic,
    size: 7,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText('LPMQ Kemenag RI', {
    x: margin + labelWidth - 95,
    y: boxFooterY,
    font: bold,
    size: 7.5,
    color: black,
  });

  // Cutting guide below box
  const cutY = labelBottomY - 25;
  page.drawLine({
    start: { x: margin, y: cutY },
    end: { x: margin + labelWidth, y: cutY },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText('--- Gunting / potong pada garis panduan ini sebelum ditempelkan pada paket pengiriman fisik ---', {
    x: (pageWidth - italic.widthOfTextAtSize('--- Gunting / potong pada garis panduan ini sebelum ditempelkan pada paket pengiriman fisik ---', 7.5)) / 2,
    y: cutY - 14,
    font: italic,
    size: 7.5,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdf.save());
}

