import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const logoPath = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));
const printable = value => String(value ?? '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E]/g, ' ');
const dateTime = value => value ? `${new Date(value).toLocaleString('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
})} WIB` : '-';

export async function renderHandoverPdf(handover) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(logoPath));
  const ink = rgb(0.12, 0.15, 0.18);
  const green = rgb(0.08, 0.38, 0.28);
  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage([595, 842]);
    page.drawImage(logo, { x: 42, y: 747, width: 58, height: 55 });
    page.drawText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', { x: 111, y: 791, font: bold, size: 11 });
    page.drawText('LAJNAH PENTASHIHAN MUSHAF AL-QURAN', { x: 111, y: 774, font: bold, size: 11 });
    page.drawText('Gedung Bayt Al-Quran & Museum Istiqlal, Jl. Raya TMII Pintu I', { x: 111, y: 758, font, size: 8 });
    page.drawText('Jakarta Timur 13560  |  lajnah@kemenag.go.id', { x: 111, y: 746, font, size: 8 });
    page.drawLine({ start: { x: 42, y: 738 }, end: { x: 553, y: 738 }, thickness: 1.4 });
    y = 705;
  };
  const drawWrapped = (value, x, maxWidth, face = font, size = 9) => {
    const words = printable(value).split(/\s+/);
    let row = '';
    const flush = () => {
      if (y < 92) addPage();
      if (row) page.drawText(row, { x, y, font: face, size, color: ink });
      y -= 15;
      row = '';
    };
    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, size) > maxWidth && row) flush();
      row = row ? `${row} ${word}` : word;
    }
    flush();
  };
  const field = (label, value) => {
    if (y < 115) addPage();
    const start = y;
    page.drawText(label, { x: 47, y, font: bold, size: 9, color: ink });
    drawWrapped(value, 205, 340);
    y = Math.min(y - 10, start - 26);
    page.drawLine({ start: { x: 42, y: y + 10 }, end: { x: 553, y: y + 10 }, thickness: 0.4, color: rgb(0.8, 0.83, 0.84) });
  };

  addPage();
  const title = 'BERITA ACARA SERAH TERIMA MASTER FISIK';
  page.drawText(title, { x: (595 - bold.widthOfTextAtSize(title, 12)) / 2, y, font: bold, size: 12, color: ink });
  y -= 22;
  drawWrapped(`Nomor: ${handover.receipt_no || '-'}`, 42, 510, bold, 10);
  y -= 13;
  field('Nomor registrasi', handover.registration?.registration_no);
  field('Judul naskah', handover.registration?.title);
  field('Penerbit', handover.registration?.publisher?.legal_name);
  field('Jenis layanan', handover.registration?.service_type?.name);
  field('Diserahkan oleh', `${handover.from_user?.name || '-'} / NIP ${handover.from_user?.nip || '-'}`);
  field('Ditujukan kepada', `${handover.to_user?.name || '-'} / NIP ${handover.to_user?.nip || '-'}`);
  field('Tanggal penyerahan', dateTime(handover.handed_over_at));
  field('Jumlah fisik', `${handover.volume_count ?? '-'} jilid`);
  field('Kondisi fisik', handover.condition);
  field('Status', handover.status === 'RECEIVED' ? 'Telah diterima distributor' : handover.status === 'RETURNED' ? 'Dikembalikan distributor' : 'Menunggu pemeriksaan dan penerimaan distributor');
  if (handover.received_at) field('Tanggal penerimaan', dateTime(handover.received_at));
  if (handover.tashih_due_at) field('Tenggat pentashihan', dateTime(handover.tashih_due_at));
  if (handover.notes) {
    y -= 8;
    drawWrapped(`Catatan: ${handover.notes}`, 47, 500);
  }

  if (y < 180) addPage();
  y -= 20;
  page.drawText('Pihak yang menyerahkan', { x: 47, y, font: bold, size: 9, color: ink });
  page.drawText('Pihak yang menerima', { x: 313, y, font: bold, size: 9, color: ink });
  y -= 40;
  page.drawText(printable(handover.from_user?.name), { x: 47, y, font: bold, size: 9, color: ink });
  page.drawText(printable(handover.status === 'RECEIVED' ? handover.to_user?.name : 'Menunggu konfirmasi'), { x: 313, y, font: bold, size: 9, color: ink });
  y -= 15;
  page.drawText(`Dicatat: ${printable(dateTime(handover.handed_over_at))}`, { x: 47, y, font, size: 8, color: green });
  page.drawText(printable(handover.status === 'RECEIVED' ? `Diterima: ${dateTime(handover.received_at)}` : 'Belum ada konfirmasi penerimaan'), { x: 313, y, font, size: 8, color: green });
  page.drawText('Dokumen diterbitkan dari catatan serah terima pada sistem LPMQ.', { x: 47, y: 57, font, size: 8, color: ink });
  return Buffer.from(await pdf.save());
}
