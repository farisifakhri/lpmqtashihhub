// Surat Persetujuan Permohonan Master Mushaf Al-Qur'an (disusun Admin, ditandatangani Kepala LPMQ via TTE).
// PDF dirender ulang dari data permohonan setiap kali diminta, sehingga isi surat selalu konsisten
// dengan data yang ditandatangani (lihat signature_hash).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const logoPath = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

// Font standar PDF hanya mendukung WinAnsi; samakan tanda kutip/pisah lalu buang karakter lain.
export const printable = (value) =>
  String(value ?? '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, ' ');

const longDate = (value) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

const dateTime = (value) =>
  `${new Date(value).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  })} WIB`;

/** Pecah teks menjadi baris yang muat pada lebar tertentu (menghormati baris baru). */
export function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of printable(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * @param {object} request MasterMushafRequest beserta relasi publisher & signed_by
 * @param {object} options { draft: boolean }
 */
export async function renderMasterLetterPdf(request, { draft = !request.signed_at } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Surat Persetujuan Master Mushaf ${request.letter_number || request.request_code}`);
  pdf.setAuthor("Lajnah Pentashihan Mushaf Al-Qur'an");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(logoPath));

  const W = 595;
  const H = 842;
  const margin = 60;
  const width = W - margin * 2;
  const black = rgb(0.08, 0.08, 0.08);
  const gray = rgb(0.35, 0.35, 0.35);
  const green = rgb(0.05, 0.32, 0.22);
  const size = 11.5;
  const leading = 16;

  let page;
  let y;

  const header = () => {
    page.drawImage(logo, { x: margin - 10, y: H - 98, width: 54, height: 50 });
    const kop = [
      { text: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', f: sansBold, s: 12 },
      { text: "LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN", f: sansBold, s: 12 },
      { text: "Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I Jakarta Timur 13560", f: sans, s: 8 },
      { text: 'Telp: (021) 8416468 - 8416466  |  lajnah.kemenag.go.id  |  lajnah@kemenag.go.id', f: sans, s: 8 },
    ];
    let ky = H - 58;
    for (const k of kop) {
      page.drawText(k.text, { x: (W - k.f.widthOfTextAtSize(k.text, k.s)) / 2 + 18, y: ky, font: k.f, size: k.s, color: black });
      ky -= k.s === 12 ? 14 : 11;
    }
    page.drawLine({ start: { x: margin - 10, y: H - 108 }, end: { x: W - margin + 10, y: H - 108 }, thickness: 1.8, color: black });
    page.drawLine({ start: { x: margin - 10, y: H - 111 }, end: { x: W - margin + 10, y: H - 111 }, thickness: 0.6, color: black });
    y = H - 140;
  };

  const newPage = () => {
    page = pdf.addPage([W, H]);
    header();
    if (draft) {
      page.drawText('DRAF', {
        x: 150, y: 330, size: 130, font: sansBold, color: rgb(0.85, 0.85, 0.85), rotate: degrees(35), opacity: 0.45,
      });
    }
  };

  const ensure = (needed) => { if (y - needed < 90) newPage(); };

  const paragraph = (text, { f = font, indent = 0, gap = 8 } = {}) => {
    for (const line of wrapText(text, f, size, width - indent)) {
      ensure(leading);
      page.drawText(line, { x: margin + indent, y, font: f, size, color: black });
      y -= leading;
    }
    y -= gap;
  };

  newPage();

  // Nomor, lampiran, hal (kiri) dan tanggal (kanan)
  const dateLabel = `Jakarta, ${longDate(request.signed_at || request.letter_drafted_at || new Date())}`;
  page.drawText(dateLabel, { x: W - margin - font.widthOfTextAtSize(dateLabel, size), y, font, size, color: black });
  const meta = [
    ['Nomor', request.letter_number || '(diberikan saat diajukan ke Kepala)'],
    ['Lampiran', '-'],
    ['Hal', request.letter_subject || "Persetujuan Permohonan Master Mushaf Al-Qur'an"],
  ];
  for (const [label, value] of meta) {
    page.drawText(label, { x: margin, y, font, size, color: black });
    page.drawText(':', { x: margin + 58, y, font, size, color: black });
    const lines = wrapText(value, font, size, width - 250);
    lines.forEach((line, i) => page.drawText(line, { x: margin + 66, y: y - i * leading, font, size, color: black }));
    y -= leading * Math.max(1, lines.length);
  }
  y -= leading;

  // Tujuan surat
  const publisherName = request.publisher?.legal_name || request.institution;
  paragraph('Yth.', { gap: 0 });
  paragraph(`${request.applicant_name}`, { f: bold, gap: 0 });
  paragraph(publisherName, { gap: 0 });
  paragraph(`di ${request.regency_name}`, { gap: leading });

  paragraph("Assalamu'alaikum warahmatullahi wabarakatuh,");
  paragraph(
    `Menindaklanjuti permohonan master mushaf Al-Qur'an yang Saudara ajukan melalui Layanan Tashih Online dengan kode ` +
    `${request.request_code} tanggal ${longDate(request.created_at)}, dengan ini Lajnah Pentashihan Mushaf Al-Qur'an ` +
    `menyetujui pemberian master mushaf "${request.mushaf_type_label}" kepada ${publisherName}.`,
  );
  if (request.letter_body) paragraph(request.letter_body);
  paragraph('Pemanfaatan master tersebut wajib memenuhi ketentuan berikut:', { gap: 2 });
  paragraph("1. Master mushaf Al-Qur'an dari LPMQ tidak diperjualbelikan.", { indent: 14, gap: 2 });
  paragraph(
    "2. Sebelum disebarluaskan kepada masyarakat, hasil penerbitan wajib memperoleh Surat Tanda Tashih sesuai prosedur LPMQ.",
    { indent: 14 },
  );
  paragraph('Demikian surat ini kami sampaikan. Atas perhatian Saudara, kami ucapkan terima kasih.');
  paragraph("Wassalamu'alaikum warahmatullahi wabarakatuh.", { gap: leading });

  // Blok tanda tangan
  ensure(130);
  const signX = W - margin - 210;
  page.drawText('Kepala Lajnah Pentashihan', { x: signX, y, font, size, color: black });
  y -= leading;
  page.drawText("Mushaf Al-Qur'an,", { x: signX, y, font, size, color: black });
  y -= 12;

  if (request.signed_at) {
    // Kotak TTE: identitas penandatangan, waktu, dan kode verifikasi (hash isi surat)
    const boxH = 54;
    page.drawRectangle({ x: signX, y: y - boxH, width: 210, height: boxH, borderColor: green, borderWidth: 1, color: rgb(0.95, 0.98, 0.96) });
    page.drawText('Ditandatangani secara elektronik', { x: signX + 8, y: y - 14, font: sansBold, size: 8, color: green });
    page.drawText(dateTime(request.signed_at), { x: signX + 8, y: y - 26, font: sans, size: 7.5, color: black });
    page.drawText(`Kode verifikasi: ${String(request.signature_hash || '').slice(0, 16).toUpperCase()}`, {
      x: signX + 8, y: y - 38, font: sans, size: 7.5, color: black,
    });
    page.drawText('Layanan Tashih Online LPMQ', { x: signX + 8, y: y - 49, font: italic, size: 6.5, color: gray });
    y -= boxH + 16;
  } else {
    page.drawText('(menunggu tanda tangan elektronik)', { x: signX, y: y - 28, font: italic, size: 8.5, color: gray });
    y -= 56;
  }
  page.drawText(printable(request.signed_by?.name || 'Kepala LPMQ'), { x: signX, y, font: bold, size, color: black });
  if (request.signed_by?.nip) {
    y -= leading;
    page.drawText(`NIP. ${printable(request.signed_by.nip)}`, { x: signX, y, font, size, color: black });
  }

  // Kaki halaman
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const foot = `${request.request_code}  |  Halaman ${i + 1} dari ${pages.length}`;
    p.drawText(foot, { x: margin, y: 40, font: sans, size: 7.5, color: gray });
    if (draft) p.drawText('DRAF - belum ditandatangani Kepala LPMQ', { x: W - margin - 170, y: 40, font: italic, size: 7.5, color: gray });
  });

  return Buffer.from(await pdf.save());
}
