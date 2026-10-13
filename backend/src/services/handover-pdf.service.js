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

const dateTime = value =>
  value
    ? `${new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      })} WIB`
    : '-';

export async function renderHandoverPdf(handover) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(logoPath));

  const margin = 45;
  const contentWidth = 595 - margin * 2; // 505

  // Warna Formal Pemerintahan
  const black = rgb(0.08, 0.08, 0.08);
  const darkGreen = rgb(0.05, 0.32, 0.22);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const tableBorder = rgb(0.4, 0.4, 0.4);

  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage([595, 842]);
    y = 842 - 42;

    // Kop Surat Resmi Kemenag LPMQ (Centered)
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
  };

  addPage();

  // 1. Judul & Nomor BAST
  const title = 'BERITA ACARA SERAH TERIMA MASTER FISIK MUSHAF AL-QUR\'AN';
  page.drawText(title, {
    x: (595 - bold.widthOfTextAtSize(title, 11)) / 2,
    y,
    font: bold,
    size: 11,
    color: black,
  });
  y -= 14;

  const bastNo = `Nomor: ${printable(handover.receipt_no || '-')}`;
  page.drawText(bastNo, {
    x: (595 - bold.widthOfTextAtSize(bastNo, 9.5)) / 2,
    y,
    font: bold,
    size: 9.5,
    color: darkGreen,
  });
  y -= 18;

  // 2. Paragraf Pengantar
  const handoverDate = handover.handed_over_at
    ? new Date(handover.handed_over_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : 'hari ini';

  const introText = `Pada hari ini, ${handoverDate}, bertempat di Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama RI, kami yang bertanda tangan di bawah ini:`;

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

  // 3. Identitas Pihak Pertama & Kedua
  const drawParty = (no, roleTitle, name, nip, partyType) => {
    page.drawText(`${no}. Nama`, { x: margin + 8, y, font: bold, size: 8, color: black });
    page.drawText(`: ${printable(name)}`, { x: margin + 70, y, font, size: 8, color: black });
    y -= 11;

    page.drawText('   NIP', { x: margin + 8, y, font: bold, size: 8, color: black });
    page.drawText(`: ${printable(nip || '-')}`, { x: margin + 70, y, font, size: 8, color: black });
    y -= 11;

    page.drawText('   Jabatan', { x: margin + 8, y, font: bold, size: 8, color: black });
    page.drawText(`: ${roleTitle}`, { x: margin + 70, y, font, size: 8, color: black });
    y -= 11;

    page.drawText(`   selaku ${partyType}`, { x: margin + 8, y, font: italic, size: 7.5, color: darkGray });
    y -= 13;
  };

  drawParty('1', 'Verifikator Pentashihan Mushaf Al-Qur\'an', handover.from_user?.name || 'Verifikator', handover.from_user?.nip, 'PIHAK PERTAMA (yang menyerahkan)');
  drawParty('2', 'Distributor Naskah Pentashihan', handover.to_user?.name || 'Distributor', handover.to_user?.nip, 'PIHAK KEDUA (yang menerima)');

  page.drawText('PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima dari PIHAK PERTAMA naskah master fisik mushaf Al-Qur\'an dengan rincian sebagai berikut:', {
    x: margin,
    y,
    font,
    size: 8,
    color: black,
  });
  y -= 14;

  // 4. Tabel Rincian Naskah BAST
  const statusLabel =
    handover.status === 'RECEIVED'
      ? 'Telah Diterima Resmi oleh Distributor'
      : handover.status === 'RETURNED'
      ? 'Dikembalikan ke Loket / Perbaikan Fisik'
      : 'Menunggu Pemeriksaan dan Penerimaan Distributor';

  const tableRows = [
    ['1', 'Nomor Registrasi', handover.registration?.registration_no || '-'],
    ['2', 'Judul Naskah Mushaf', handover.registration?.title || '-'],
    ['3', 'Nama Pemohon / Penerbit', handover.registration?.publisher?.legal_name || '-'],
    ['4', 'Jenis Layanan', handover.registration?.service_type?.name || 'Pentashihan'],
    ['5', 'Jumlah Master Fisik', `${handover.volume_count ?? '-'} jilid`],
    ['6', 'Kondisi Naskah Fisik', handover.condition || 'Baik dan Lengkap'],
    ['7', 'Status Serah Terima', statusLabel],
    ['8', 'Waktu Penyerahan', dateTime(handover.handed_over_at)],
  ];

  if (handover.received_at) {
    tableRows.push(['9', 'Waktu Diterima', dateTime(handover.received_at)]);
  }
  if (handover.tashih_due_at) {
    tableRows.push(['10', 'Tenggat Waktu Pentashihan', dateTime(handover.tashih_due_at)]);
  }
  if (handover.notes) {
    tableRows.push(['11', 'Catatan Tambahan', handover.notes]);
  }

  const colNoW = 24;
  const colLabelW = 160;
  const rowHeight = 17.5;
  const tableStartY = y;

  for (let i = 0; i < tableRows.length; i++) {
    const [no, label, val] = tableRows[i];
    const curRowY = tableStartY - (i + 1) * rowHeight;
    const isHighlight = label === 'Status Serah Terima';

    page.drawLine({
      start: { x: margin, y: curRowY },
      end: { x: margin + contentWidth, y: curRowY },
      thickness: 0.5,
      color: tableBorder,
    });

    page.drawText(printable(no), {
      x: margin + 6,
      y: curRowY + 5.5,
      size: 8,
      font,
      color: black,
    });

    page.drawText(printable(label), {
      x: margin + colNoW + 6,
      y: curRowY + 5.5,
      size: 8,
      font: bold,
      color: black,
    });

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
      y: curRowY + 5.5,
      size: 8,
      font: isHighlight ? bold : font,
      color: isHighlight ? darkGreen : black,
    });
  }

  const tableTotalH = rowHeight * tableRows.length;
  page.drawRectangle({
    x: margin,
    y: tableStartY - tableTotalH,
    width: contentWidth,
    height: tableTotalH,
    borderColor: tableBorder,
    borderWidth: 0.8,
  });

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

  y = tableStartY - tableTotalH - 14;

  // 5. Penutup BAST
  page.drawText('Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya dalam rangkap yang sah untuk dipergunakan sebagaimana mestinya.', {
    x: margin,
    y,
    font,
    size: 7.5,
    color: black,
  });
  y -= 18;

  // 6. Pengesahan Dua Belah Pihak
  const colLeftX = margin + 20;
  const colRightX = 595 - margin - 200;

  page.drawText('PIHAK PERTAMA (Yang Menyerahkan)', {
    x: colLeftX,
    y,
    size: 8,
    font: bold,
    color: black,
  });
  page.drawText('PIHAK KEDUA (Yang Menerima)', {
    x: colRightX,
    y,
    size: 8,
    font: bold,
    color: black,
  });
  y -= 10;

  page.drawText('Verifikator Pentashihan,', {
    x: colLeftX,
    y,
    size: 7.5,
    font,
    color: darkGray,
  });
  page.drawText('Distributor Naskah Pentashihan,', {
    x: colRightX,
    y,
    size: 7.5,
    font,
    color: darkGray,
  });

  y -= 45;

  const giverName = printable(handover.from_user?.name || 'Verifikator');
  page.drawText(`( ${giverName} )`, {
    x: colLeftX,
    y,
    size: 8,
    font: bold,
    color: black,
  });

  const receiverName = printable(
    handover.status === 'RECEIVED' ? handover.to_user?.name || 'Distributor' : 'Menunggu Konfirmasi Penerimaan'
  );
  page.drawText(`( ${receiverName} )`, {
    x: colRightX,
    y,
    size: 8,
    font: bold,
    color: black,
  });
  y -= 10;

  page.drawText(`NIP. ${printable(handover.from_user?.nip || '-')}`, {
    x: colLeftX,
    y,
    size: 7.5,
    font,
    color: darkGray,
  });
  page.drawText(
    handover.status === 'RECEIVED' ? `NIP. ${printable(handover.to_user?.nip || '-')}` : 'Belum konfirmasi',
    {
      x: colRightX,
      y,
      size: 7.5,
      font,
      color: darkGray,
    }
  );

  // 7. Catatan Kaki Resmi
  const footerY = 32;
  page.drawLine({
    start: { x: margin, y: footerY + 12 },
    end: { x: 595 - margin, y: footerY + 12 },
    thickness: 0.5,
    color: tableBorder,
  });
  page.drawText('Berita Acara Serah Terima (BAST) ini diterbitkan secara otomatis dari data alur kerja pentashihan mushaf Al-Qur\'an LPMQ.', {
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
