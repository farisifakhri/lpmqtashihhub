import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

function safeText(value, font) {
  const text = String(value ?? '');
  for (const character of text) {
    try {
      font.encodeText(character);
    } catch {
      return text.replace(/[^\x00-\x7F]/g, '');
    }
  }
  return text;
}

export async function renderRegistrationReceiptPdf(reg) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait (points)

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - 48;

  // Palette
  const black = rgb(0.1, 0.1, 0.1);
  const darkGreen = rgb(0.08, 0.38, 0.28);
  const gray = rgb(0.45, 0.45, 0.45);
  const lightGray = rgb(0.95, 0.96, 0.97);
  const borderGray = rgb(0.82, 0.84, 0.86);

  // 1. Kop Surat Resmi
  page.drawText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', {
    x: width / 2 - font.widthOfTextAtSize('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 10.5) / 2,
    y,
    size: 10.5,
    font: bold,
    color: black,
  });
  y -= 13;

  page.drawText('BADAN PENELITIAN DAN PENGEMBANGAN SERTA PENDIDIKAN DAN PELATIHAN', {
    x: width / 2 - font.widthOfTextAtSize('BADAN PENELITIAN DAN PENGEMBANGAN SERTA PENDIDIKAN DAN PELATIHAN', 8.5) / 2,
    y,
    size: 8.5,
    font: bold,
    color: black,
  });
  y -= 14;

  const lpmqTitle = "LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN";
  page.drawText(lpmqTitle, {
    x: width / 2 - bold.widthOfTextAtSize(lpmqTitle, 12) / 2,
    y,
    size: 12,
    font: bold,
    color: darkGreen,
  });
  y -= 11;

  const addrText = 'Gedung Bayt Al-Quran & Museum Istiqlal, TMII, Jakarta Timur 13560 | Website: tashih.kemenag.go.id';
  page.drawText(addrText, {
    x: width / 2 - font.widthOfTextAtSize(addrText, 7.5) / 2,
    y,
    size: 7.5,
    font,
    color: gray,
  });
  y -= 9;

  // Double horizontal rule
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: black,
  });
  page.drawLine({
    start: { x: margin, y: y - 2 },
    end: { x: width - margin, y: y - 2 },
    thickness: 0.5,
    color: black,
  });
  y -= 22;

  // 2. Title & Nomor Registrasi
  const titleText = "TANDA TERIMA PENGAJUAN PENTASHIHAN MUSHAF AL-QUR'AN";
  page.drawText(titleText, {
    x: width / 2 - bold.widthOfTextAtSize(titleText, 11) / 2,
    y,
    size: 11,
    font: bold,
    color: black,
  });
  y -= 15;

  const regNoText = `NOMOR REGISTRASI: ${reg.registration_no || '-'}`;
  page.drawText(regNoText, {
    x: width / 2 - bold.widthOfTextAtSize(regNoText, 10) / 2,
    y,
    size: 10,
    font: bold,
    color: darkGreen,
  });
  y -= 22;

  // 3. Metadata Table
  const meta = reg.foreign_metadata || {};
  const namaMushaf = meta.nama_mushaf || '-';
  const jenisMushaf = meta.jenis_mushaf || 'Mushaf Standar Usmani';
  const namaPercetakan = meta.nama_percetakan || '-';
  const pjNama = meta.penanggung_jawab_produk || reg.publisher?.name || '-';
  const pjWa = meta.penanggung_jawab_wa || '-';
  const pjEmail = meta.penanggung_jawab_email || '-';

  const categoryLabel =
    reg.registration_category === 'EXTENSION'
      ? 'Perpanjangan Surat Tanda Tashih'
      : reg.registration_category === 'FOREIGN_MANUSCRIPT'
      ? "Mushaf Al-Qur'an Luar Negeri (Impor)"
      : 'Surat Tanda Tashih Baru';

  const dateFormatted = new Date(reg.created_at || Date.now()).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  const rows = [
    ['Kategori Permohonan', categoryLabel],
    ['Tanggal & Waktu Pengajuan', `${dateFormatted} WIB`],
    ['Nama Pemohon / Penerbit', reg.publisher?.legal_name || 'Penerbit Terdaftar'],
    ['Nama Produk / Judul Naskah', reg.title || '-'],
    ['Nama Mushaf', namaMushaf],
    ['Jenis Standar Mushaf', jenisMushaf],
    ['Nama Percetakan', namaPercetakan],
    ['Penanggung Jawab Produk', pjNama],
    ['Nomor WhatsApp PJ', pjWa],
    ['Email Penanggung Jawab', pjEmail],
    ['Status Pendaftaran', 'Terdaftar Resmi di Sistem LPMQ Kemenag RI'],
  ];

  const tableX = margin;
  const tableWidth = width - margin * 2;
  const col1Width = 170;
  const rowHeight = 20;

  for (let i = 0; i < rows.length; i++) {
    const [label, val] = rows[i];
    const isEven = i % 2 === 0;

    if (isEven) {
      page.drawRectangle({
        x: tableX,
        y: y - rowHeight + 5,
        width: tableWidth,
        height: rowHeight,
        color: lightGray,
      });
    }

    // Border line bottom
    page.drawLine({
      start: { x: tableX, y: y - rowHeight + 5 },
      end: { x: tableX + tableWidth, y: y - rowHeight + 5 },
      thickness: 0.5,
      color: borderGray,
    });

    page.drawText(safeText(label, bold), {
      x: tableX + 8,
      y: y - 9,
      size: 8.5,
      font: bold,
      color: black,
    });

    const isHighlight = label === 'Status Pendaftaran' || label === 'Nama Pemohon / Penerbit';
    page.drawText(safeText(val, isHighlight ? bold : font), {
      x: tableX + col1Width + 8,
      y: y - 9,
      size: 8.5,
      font: isHighlight ? bold : font,
      color: label === 'Status Pendaftaran' ? darkGreen : black,
    });

    y -= rowHeight;
  }

  // Border keliling tabel
  page.drawRectangle({
    x: tableX,
    y: y + 5,
    width: tableWidth,
    height: rowHeight * rows.length,
    borderColor: borderGray,
    borderWidth: 0.75,
  });

  // Garis vertikal pemisah kolom
  page.drawLine({
    start: { x: tableX + col1Width, y: y + 5 },
    end: { x: tableX + col1Width, y: y + 5 + rowHeight * rows.length },
    thickness: 0.5,
    color: borderGray,
  });

  y -= 16;

  // 4. Saluran Notifikasi Otomatis Box
  if (pjWa !== '-' || pjEmail !== '-') {
    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: tableWidth,
      height: 44,
      color: rgb(0.94, 0.98, 0.95),
      borderColor: rgb(0.7, 0.88, 0.75),
      borderWidth: 0.75,
    });

    page.drawText('Saluran Notifikasi Otomatis Aktif:', {
      x: margin + 8,
      y: y - 4,
      size: 8,
      font: bold,
      color: darkGreen,
    });

    const notifDetail = `Pemberitahuan verifikasi berkas, tagihan PNBP (SIMPONI), sidang tashih, hingga STT`;
    const notifTarget = `dikirim ke Email: ${pjEmail} dan WhatsApp: ${pjWa}`;
    page.drawText(notifDetail, {
      x: margin + 8,
      y: y - 16,
      size: 7.5,
      font,
      color: rgb(0.15, 0.35, 0.22),
    });
    page.drawText(notifTarget, {
      x: margin + 8,
      y: y - 27,
      size: 7.5,
      font: bold,
      color: rgb(0.15, 0.35, 0.22),
    });

    y -= 48;
  }

  // 5. Petunjuk Langkah Selanjutnya
  page.drawRectangle({
    x: margin,
    y: y - 50,
    width: tableWidth,
    height: 58,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: borderGray,
    borderWidth: 0.75,
  });

  page.drawText('Petunjuk Langkah Selanjutnya:', {
    x: margin + 8,
    y: y - 4,
    size: 8,
    font: bold,
    color: black,
  });

  const instructions = [
    '1. Cetak lembar tanda terima pendaftaran ini sebanyak 1 (satu) eksemplar sebagai bukti pendaftaran resmi.',
    '2. Siapkan naskah master cetak fisik (kertas HVS/A4 dijilid rapi per juz) beserta lembar tanda terima ini.',
    '3. Serahkan naskah master ke Loket Pelayanan LPMQ di Gedung Bayt Al-Quran & Museum Istiqlal TMII Jakarta.',
    '4. Pantau progres status secara berkala melalui portal Tashih Hub (tashih.kemenag.go.id).',
  ];

  let instY = y - 16;
  for (const inst of instructions) {
    page.drawText(inst, {
      x: margin + 8,
      y: instY,
      size: 7,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    instY -= 10;
  }

  y -= 65;

  // 6. QR Code & Footer Verification
  const qrDataUrl = await QRCode.toDataURL(`https://tashih.kemenag.go.id/verify/${reg.registration_no || ''}`, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
  });
  const qrImage = await pdf.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));

  page.drawImage(qrImage, {
    x: margin,
    y: y - 44,
    width: 48,
    height: 48,
  });

  page.drawText('Verifikasi QR Sistem Pendaftaran', {
    x: margin + 56,
    y: y - 10,
    size: 8,
    font: bold,
    color: black,
  });
  page.drawText(`No. Registrasi: ${reg.registration_no || '-'}`, {
    x: margin + 56,
    y: y - 21,
    size: 7.5,
    font,
    color: gray,
  });
  page.drawText('Sah & Terverifikasi Otomatis oleh Sistem Layanan Tanda Tashih LPMQ', {
    x: margin + 56,
    y: y - 32,
    size: 7,
    font: bold,
    color: darkGreen,
  });

  const footerRight = 'Diterbitkan secara elektronik oleh LPMQ Kemenag RI';
  page.drawText(footerRight, {
    x: width - margin - font.widthOfTextAtSize(footerRight, 7.5),
    y: y - 20,
    size: 7.5,
    font,
    color: gray,
  });

  return Buffer.from(await pdf.save());
}
