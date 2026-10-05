import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const logoPath = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

const printable = value => String(value ?? '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E]/g, ' ');

export async function renderPhysicalMasterReceiptPdf(reg) {
  const intake = reg.physical_master_intake;
  if (intake?.status !== 'RECEIVED' || !intake.receipt_no) throw new Error('Tanda terima master fisik belum diterbitkan.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(logoPath));
  const page = pdf.addPage([595, 842]);
  const ink = rgb(0.12, 0.15, 0.18);
  const green = rgb(0.08, 0.38, 0.28);
  page.drawImage(logo, { x: 42, y: 747, width: 58, height: 55 });
  page.drawText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', { x: 111, y: 791, font: bold, size: 11 });
  page.drawText('LAJNAH PENTASHIHAN MUSHAF AL-QURAN', { x: 111, y: 774, font: bold, size: 11 });
  page.drawText('Gedung Bayt Al-Quran & Museum Istiqlal, Jl. Raya TMII Pintu I', { x: 111, y: 758, font, size: 8 });
  page.drawText('Jakarta Timur 13560  |  lajnah@kemenag.go.id', { x: 111, y: 746, font, size: 8 });
  page.drawLine({ start: { x: 42, y: 738 }, end: { x: 553, y: 738 }, thickness: 1.4 });

  const title = 'TANDA TERIMA MASTER FISIK MUSHAF';
  page.drawText(title, { x: (595 - bold.widthOfTextAtSize(title, 12)) / 2, y: 701, font: bold, size: 12, color: ink });
  const number = printable(intake.receipt_no);
  page.drawText(number, { x: (595 - bold.widthOfTextAtSize(number, 10)) / 2, y: 681, font: bold, size: 10, color: green });

  let y = 638;
  const date = intake.received_at
    ? new Date(intake.received_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
    : '-';
  const rows = [
    ['Tanggal penerimaan', date],
    ['Nomor registrasi', reg.registration_no],
    ['Judul naskah', reg.title],
    ['Penerbit', reg.publisher?.legal_name],
    ['Jenis layanan', reg.service_type?.name],
    ['Jumlah master fisik', `${intake.volume_count ?? '-'} jilid`],
    ['Format / penjilidan', `${intake.format || '-'} / ${intake.binding_method || '-'}`],
    ['Kondisi saat diterima', intake.condition],
    ['Petugas penerima', intake.received_by?.name],
  ];
  const drawWrapped = (value, x, startY, maxWidth, face = font) => {
    const words = printable(value).split(/\s+/);
    let line = '';
    let currentY = startY;
    const flush = () => {
      if (line) page.drawText(line, { x, y: currentY, font: face, size: 9, color: ink });
      currentY -= 14;
      line = '';
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, 9) > maxWidth && line) flush();
      line = line ? `${line} ${word}` : word;
    }
    flush();
    return currentY;
  };
  for (const [label, value] of rows) {
    const valueEnd = drawWrapped(value, 205, y, 343);
    page.drawText(label, { x: 47, y, font: bold, size: 9, color: ink });
    y = Math.min(y - 26, valueEnd - 11);
    page.drawLine({ start: { x: 42, y: y + 11 }, end: { x: 553, y: y + 11 }, thickness: 0.4, color: rgb(0.8, 0.83, 0.84) });
  }
  if (intake.notes) {
    y -= 12;
    page.drawText('Catatan penerimaan:', { x: 47, y, font: bold, size: 9, color: ink });
    y = drawWrapped(intake.notes, 47, y - 18, 500);
  }
  y -= 23;
  page.drawText('Master fisik telah diterima di loket LPMQ. Simpan dokumen ini sebagai bukti penerimaan.', { x: 47, y, font, size: 9, color: ink });
  page.drawText('Proses berikutnya: penugasan verifikator dan pemeriksaan naskah.', { x: 47, y: y - 17, font, size: 9, color: green });
  page.drawText('Dokumen diterbitkan dari data penerimaan pada sistem LPMQ.', { x: 47, y: 57, font, size: 8, color: ink });
  return Buffer.from(await pdf.save());
}
