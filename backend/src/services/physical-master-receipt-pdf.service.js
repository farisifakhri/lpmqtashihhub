import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const logoPath = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

const printable = value =>
  String(value ?? '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, ' ');

export async function renderPhysicalMasterReceiptPdf(reg) {
  const intake = reg.physical_master_intake;
  if (intake?.status !== 'RECEIVED' || !intake.receipt_no) {
    throw new Error('Tanda terima master fisik belum diterbitkan.');
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(logoPath));
  const page = pdf.addPage([595, 842]); // A4 portrait

  const margin = 45;
  const contentWidth = 595 - margin * 2; // 505
  let y = 842 - 42;

  // Warna Formal Pemerintahan
  const black = rgb(0.08, 0.08, 0.08);
  const darkGreen = rgb(0.05, 0.32, 0.22);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const tableBorder = rgb(0.4, 0.4, 0.4);

  // 1. Kop Surat Resmi Kemenag LPMQ (Centered)
  page.drawImage(logo, { x: margin, y: 744, width: 54, height: 50 });

  const kopLines = [
    { text: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', font: bold, size: 12 },
    { text: "LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN", font: bold, size: 12 },
    { text: "Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I Jakarta Timur 13560", font, size: 8 },
    { text: 'Telp: (021) 87798807, 8416466, 8416467, 8416468 Fax: (021) 87798807', font, size: 8 },
    { text: 'Website: http://lajnah.kemenag.go.id Email : lajnah@kemenag.go.id', font, size: 8 },
  ];

  let curY = 786;
  for (const item of kopLines) {
    const textW = item.font.widthOfTextAtSize(item.text, item.size);
    page.drawText(item.text, {
      x: (595 - textW) / 2,
      y: curY,
      font: item.font,
      size: item.size,
      color: black,
    });
    curY -= item.size === 12 ? 14 : 11;
  }

  // Garis Pemisah Kop Surat Resmi
  y = 728;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 595 - margin, y },
    thickness: 1.8,
    color: black,
  });
  y -= 18;

  // 2. Judul & Nomor Tanda Terima
  const title = 'TANDA TERIMA PENYERAHAN MASTER FISIK MUSHAF AL-QUR\'AN';
  page.drawText(title, {
    x: (595 - bold.widthOfTextAtSize(title, 11)) / 2,
    y,
    font: bold,
    size: 11,
    color: black,
  });
  y -= 14;

  const receiptNoStr = `Nomor: ${printable(intake.receipt_no)}`;
  page.drawText(receiptNoStr, {
    x: (595 - bold.widthOfTextAtSize(receiptNoStr, 9.5)) / 2,
    y,
    font: bold,
    size: 9.5,
    color: darkGreen,
  });
  y -= 18;

  // 3. Kalimat Pengantar Formal
  const dateFormatted = intake.received_at
    ? new Date(intake.received_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : '-';

  const introText =
    `Pada hari ini, bertempat di Loket Pelayanan Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Jakarta, telah diterima master fisik mushaf Al-Qur'an untuk permohonan Surat Tanda Tashih dengan rincian sebagai berikut:`;

  const words = introText.split(' ');
  let lineBuf = '';
  for (const w of words) {
    const candidate = lineBuf ? `${lineBuf} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, 8.5) > contentWidth) {
      page.drawText(lineBuf, { x: margin, y, font, size: 8.5, color: black });
      y -= 12;
      lineBuf = w;
    } else {
      lineBuf = candidate;
    }
  }
  if (lineBuf) {
    page.drawText(lineBuf, { x: margin, y, font, size: 8.5, color: black });
    y -= 14;
  }

  // 4. Data Rincian Penerimaan Fisik
  const rows = [
    ['1', 'Nomor Registrasi Permohonan', reg.registration_no || '-'],
    ['2', 'Tanggal & Waktu Penerimaan', dateFormatted],
    ['3', 'Nama Pemohon / Penerbit', reg.publisher?.legal_name || 'Penerbit Terdaftar'],
    ['4', 'Nama Produk / Judul Naskah', reg.title || '-'],
    ['5', 'Jenis Layanan Pentashihan', reg.service_type?.name || 'Pentashihan Mushaf'],
    ['6', 'Jumlah Master Fisik', `${intake.volume_count ?? '-'} jilid`],
    ['7', 'Format & Penjilidan', `${intake.format || 'A4'} / ${intake.binding_method || 'Per Juz'}`],
    ['8', 'Kondisi Naskah saat Diterima', intake.condition || 'Baik dan Lengkap'],
    ['9', 'Petugas Penerima Loket', intake.received_by?.name || '-'],
  ];

  if (intake.notes) {
    rows.push(['10', 'Catatan Pemeriksaan Loket', intake.notes]);
  }

  const colNoW = 24;
  const colLabelW = 165;
  const rowHeight = 19;
  const tableStartY = y;

  for (let i = 0; i < rows.length; i++) {
    const [no, label, val] = rows[i];
    const curRowY = tableStartY - (i + 1) * rowHeight;

    // Garis horizontal pembatas baris
    page.drawLine({
      start: { x: margin, y: curRowY },
      end: { x: margin + contentWidth, y: curRowY },
      thickness: 0.5,
      color: tableBorder,
    });

    // No
    page.drawText(printable(no), {
      x: margin + 6,
      y: curRowY + 6,
      size: 8,
      font,
      color: black,
    });

    // Label
    page.drawText(printable(label), {
      x: margin + colNoW + 6,
      y: curRowY + 6,
      size: 8,
      font: bold,
      color: black,
    });

    // Nilai (wrap jika terlalu panjang)
    const maxValW = contentWidth - colNoW - colLabelW - 12;
    let displayVal = printable(val);
    if (font.widthOfTextAtSize(displayVal, 8) > maxValW) {
      while (displayVal.length > 5 && font.widthOfTextAtSize(displayVal + '...', 8) > maxValW) {
        displayVal = displayVal.slice(0, -1);
      }
      displayVal += '...';
    }

    page.drawText(displayVal, {
      x: margin + colNoW + colLabelW + 6,
      y: curRowY + 6,
      size: 8,
      font,
      color: black,
    });
  }

  // Bingkai luar tabel
  const tableTotalH = rowHeight * rows.length;
  page.drawRectangle({
    x: margin,
    y: tableStartY - tableTotalH,
    width: contentWidth,
    height: tableTotalH,
    borderColor: tableBorder,
    borderWidth: 0.8,
  });

  // Garis vertikal pembatas kolom
  page.drawLine({
    start: { x: margin + colNoW, y: tableStartY },
    end: { x: margin + colNoW, y: tableStartY - tableTotalH },
    thickness: 0.5,
    color: tableBorder,
  });
  page.drawLine({
    start: { x: margin + colNoW + colLabelW, y: tableStartY },
    end: { x: margin + colNoW + colLabelW, y: tableStartY - tableTotalH },
    thickness: 0.5,
    color: tableBorder,
  });

  y = tableStartY - tableTotalH - 16;

  // 5. Klausul Pernyataan Resmi
  const statement = [
    'Master cetak fisik di atas telah diperiksa kelengkapan fisiknya dan dinyatakan diterima di Loket Pelayanan',
    'Lajnah Pentashihan Mushaf Al-Qur\'an untuk diproses ke tahapan penugasan verifikator dan pemeriksaan naskah.',
    'Harap simpan lembar tanda terima ini sebagai bukti sah penyerahan dokumen fisik.',
  ];
  for (const st of statement) {
    page.drawText(st, {
      x: margin,
      y,
      size: 8,
      font,
      color: black,
    });
    y -= 11;
  }

  y -= 12;

  // 6. Pengesahan Dua Kolom (Serah Terima Resmi)
  const currentDateIndo = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const colLeftX = margin + 20;
  const colRightX = 595 - margin - 190;

  page.drawText('Yang menyerahkan,', {
    x: colLeftX,
    y,
    size: 8.5,
    font: bold,
    color: black,
  });
  page.drawText(`Jakarta, ${currentDateIndo}`, {
    x: colRightX,
    y,
    size: 8.5,
    font,
    color: black,
  });
  y -= 11;

  page.drawText('Pemohon / Penerbit,', {
    x: colLeftX,
    y,
    size: 8,
    font,
    color: black,
  });
  page.drawText('Petugas Loket Pelayanan LPMQ,', {
    x: colRightX,
    y,
    size: 8,
    font: bold,
    color: black,
  });

  y -= 52;

  // Nama Penandatangan
  const publisherSigner = printable(reg.publisher?.legal_name || 'Pemohon');
  page.drawText(`( ${publisherSigner.slice(0, 32)} )`, {
    x: colLeftX,
    y,
    size: 8,
    font: bold,
    color: black,
  });

  const officerSigner = printable(intake.received_by?.name || 'Petugas Loket');
  page.drawText(`( ${officerSigner} )`, {
    x: colRightX,
    y,
    size: 8,
    font: bold,
    color: black,
  });
  y -= 10;

  page.drawText('Materai / Tanda Tangan', {
    x: colLeftX + 15,
    y,
    size: 7,
    font: italic,
    color: darkGray,
  });
  page.drawText('NIP. .................................................', {
    x: colRightX,
    y,
    size: 7.5,
    font,
    color: darkGray,
  });

  // 7. Catatan Kaki Resmi
  const footerY = 32;
  page.drawLine({
    start: { x: margin, y: footerY + 12 },
    end: { x: 595 - margin, y: footerY + 12 },
    thickness: 0.5,
    color: tableBorder,
  });
  page.drawText('Dokumen ini merupakan tanda terima resmi LPMQ yang dicatat otomatis dalam basis data sistem pentashihan.', {
    x: margin,
    y: footerY + 3,
    size: 6.5,
    font: italic,
    color: darkGray,
  });
  page.drawText('Kementerian Agama Republik Indonesia - Balai Litbang dan Diklat - Lajnah Pentashihan Mushaf Al-Qur\'an.', {
    x: margin,
    y: footerY - 5,
    size: 6.5,
    font: italic,
    color: darkGray,
  });

  return Buffer.from(await pdf.save());
}
