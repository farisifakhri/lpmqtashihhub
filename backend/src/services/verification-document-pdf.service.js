import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { fail } from './workflow-utils.js';
import { readStoredFile } from './storage.service.js';

const storageRoot = fileURLToPath(new URL('../../storage/private/', import.meta.url));
const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));
const label = {
  NOTA_DINAS_VERIFIKASI: 'NOTA DINAS PENUGASAN VERIFIKASI',
  SURAT_HASIL_VERIFIKASI: 'SURAT HASIL VERIFIKASI',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'SURAT PEMBERITAHUAN HASIL VERIFIKASI',
  BERITA_ACARA_VERIFIKASI: 'BERITA ACARA VERIFIKASI',
};
export const fileHash = bytes => createHash('sha256').update(bytes).digest('hex');
export const verificationUrl = token => `${ENV.PUBLIC_APP_URL?.replace(/\/$/, '')}/verify-internal/${token}`;

function safeText(value, font) {
  const text = String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
  for (const character of text) {
    try { font.encodeText(character); }
    catch { fail(422, 'PDF belum dapat dibuat karena ada karakter yang belum didukung oleh font dokumen. Hubungi administrator untuk dukungan font tersebut.'); }
  }
  return text;
}

export async function renderVerificationPdf(document, { draft = false, approver = null, approvedAt = null } = {}) {
  if (!draft && !ENV.PUBLIC_APP_URL) fail(503, 'PUBLIC_APP_URL perlu diatur sebelum QR dokumen diterbitkan.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(letterheadLogo));

  const margin = 45;
  const contentWidth = 595 - margin * 2; // 505
  const black = rgb(0.08, 0.08, 0.08);
  const darkGreen = rgb(0.05, 0.32, 0.22);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const tableBorder = rgb(0.4, 0.4, 0.4);

  let page;
  let y;

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 842 - 42;

    // Kop Surat Resmi Kemenag LPMQ (Centered)
    page.drawImage(logo, { x: margin, y: 744, width: 54, height: 50 });

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
        x: (595 - textW) / 2,
        y: currentY,
        font: item.font,
        size: item.size,
        color: black,
      });
      currentY -= item.size === 12 ? 14 : 11;
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

    if (draft) {
      page.drawText('DRAF - BELUM DISETUJUI', {
        x: 410,
        y: 808,
        font: bold,
        size: 8.5,
        color: rgb(0.75, 0.1, 0.1),
      });
    }
  };

  const line = (value, emphasized = false, size = 9, indent = 0) => {
    const face = emphasized ? bold : font;
    const text = safeText(value, face);
    const words = text.split(/\s+/);
    let row = '';
    const maxW = contentWidth - indent;

    const flush = () => {
      if (y < 85) newPage();
      page.drawText(row, { x: margin + indent, y, font: face, size, color: black });
      y -= size + 5;
      row = '';
    };

    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, size) > maxW && row) flush();
      row = row ? `${row} ${word}` : word;
      if (face.widthOfTextAtSize(row, size) > maxW) {
        fail(422, 'PDF belum dapat dibuat karena ada kata terlalu panjang untuk ukuran halaman.');
      }
    }
    flush();
  };

  const content = document.content_snapshot || {};
  const date =
    approvedAt ||
    (content.assigned_at
      ? new Date(content.assigned_at)
      : new Date(content.submitted_at || content.saved_at || Date.now()));
  const dateLabel = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  newPage();

  if (document.document_type === 'NOTA_DINAS_VERIFIKASI') {
    // Judul Lembar Disposisi Resmi
    const title = 'LEMBAR DISPOSISI PENUGASAN VERIFIKASI';
    page.drawText(title, {
      x: (595 - bold.widthOfTextAtSize(title, 11)) / 2,
      y,
      font: bold,
      size: 11,
      color: black,
    });
    y -= 13;

    const memoNo = `Nomor: ${safeText(document.document_no || 'Belum diberi nomor', bold)}`;
    page.drawText(memoNo, {
      x: (595 - bold.widthOfTextAtSize(memoNo, 9)) / 2,
      y,
      font: bold,
      size: 9,
      color: darkGreen,
    });
    y -= 16;

    const dueLabel = content.due_at
      ? new Date(content.due_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })
      : '-';

    // 1. Bar Sifat & Tanggal
    const barH = 19;
    page.drawRectangle({
      x: margin,
      y: y - barH,
      width: contentWidth,
      height: barH,
      color: rgb(0.95, 0.97, 0.96),
      borderColor: tableBorder,
      borderWidth: 0.5,
    });

    page.drawText('SIFAT: SEGERA / PRIORITAS', {
      x: margin + 8,
      y: y - 13,
      font: bold,
      size: 7.5,
      color: darkGreen,
    });
    page.drawText(`TANGGAL PENUGASAN: ${dateLabel}`, {
      x: margin + 175,
      y: y - 13,
      font: font,
      size: 7.5,
      color: black,
    });
    page.drawText(`TARGET SLA: ${dueLabel}`, {
      x: margin + 355,
      y: y - 13,
      font: bold,
      size: 7.5,
      color: black,
    });
    y -= barH + 8;

    // Helper untuk Section Box
    const drawSectionHeader = (secTitle, boxY, boxW) => {
      page.drawRectangle({
        x: margin,
        y: boxY - 16,
        width: boxW,
        height: 16,
        color: rgb(0.92, 0.94, 0.96),
        borderColor: tableBorder,
        borderWidth: 0.5,
      });
      page.drawText(secTitle, {
        x: margin + 8,
        y: boxY - 12,
        font: bold,
        size: 7.5,
        color: black,
      });
    };

    // 2. Data Pengajuan & Naskah Mushaf
    const dataBoxH = 68;
    page.drawRectangle({
      x: margin,
      y: y - dataBoxH,
      width: contentWidth,
      height: dataBoxH,
      color: rgb(1, 1, 1),
      borderColor: tableBorder,
      borderWidth: 0.5,
    });
    drawSectionHeader('1. DATA PENGAJUAN & NASKAH MUSHAF', y, contentWidth);

    const regSpecs = [
      ['Nomor Registrasi', safeText(content.registration_no || '-', bold), 'Tanda Terima LPMQ', safeText(`${content.physical_receipt_no || '-'} (${content.volume_count || '-'} jilid)`, font)],
      ['Judul Naskah Mushaf', safeText(content.title || '-', bold), 'Status Alur', 'Terdaftar (Siap Verifikasi)'],
      ['Nama Pemohon / Penerbit', safeText(content.publisher_name || '-', font), 'Kategori', 'Tanda Tashih Baru'],
    ];

    let rowY = y - 30;
    for (const [l1, v1, l2, v2] of regSpecs) {
      page.drawText(l1, { x: margin + 8, y: rowY, font: font, size: 7.5, color: darkGray });
      page.drawText(':', { x: margin + 105, y: rowY, font: font, size: 7.5, color: black });
      page.drawText(v1, { x: margin + 112, y: rowY, font: l1.includes('Judul') || l1.includes('Nomor') ? bold : font, size: 7.5, color: black });

      page.drawText(l2, { x: margin + 300, y: rowY, font: font, size: 7.5, color: darkGray });
      page.drawText(':', { x: margin + 395, y: rowY, font: font, size: 7.5, color: black });
      page.drawText(v2, { x: margin + 402, y: rowY, font, size: 7.5, color: black });
      rowY -= 14;
    }
    y -= dataBoxH + 8;

    // 3. Disposisi Diteruskan Kepada
    const dispBoxH = 46;
    page.drawRectangle({
      x: margin,
      y: y - dispBoxH,
      width: contentWidth,
      height: dispBoxH,
      color: rgb(1, 1, 1),
      borderColor: tableBorder,
      borderWidth: 0.5,
    });
    drawSectionHeader('2. DISPOSISI PENUGASAN DITERUSKAN KEPADA', y, contentWidth);

    page.drawText('Verifikator Ditugaskan', { x: margin + 8, y: y - 29, font: font, size: 7.5, color: darkGray });
    page.drawText(':', { x: margin + 105, y: y - 29, font: font, size: 7.5, color: black });
    page.drawText(safeText(content.verifier_name || '-', bold), { x: margin + 112, y: y - 29, font: bold, size: 8.5, color: darkGreen });

    page.drawText('Unit Kerja / Penugasan', { x: margin + 8, y: y - 41, font: font, size: 7.5, color: darkGray });
    page.drawText(':', { x: margin + 105, y: y - 41, font: font, size: 7.5, color: black });
    page.drawText('Tim Verifikasi Administrasi & Master Fisik Pentashihan Mushaf LPMQ', { x: margin + 112, y: y - 41, font, size: 7.5, color: black });
    y -= dispBoxH + 8;

    // 4. Petunjuk & Instruksi Kerja Verifikasi
    const sopBoxH = 88;
    page.drawRectangle({
      x: margin,
      y: y - sopBoxH,
      width: contentWidth,
      height: sopBoxH,
      color: rgb(1, 1, 1),
      borderColor: tableBorder,
      borderWidth: 0.5,
    });
    drawSectionHeader('3. PETUNJUK & INSTRUKSI KERJA VERIFIKASI (SOP PENTASHIHAN)', y, contentWidth);

    const sops = [
      '[X]  1. Periksa kelengkapan administrasi permohonan, legalitas pemohon, dan file digital (sampul & sampel).',
      '[X]  2. Periksa kesesuaian master cetak fisik A4 per juz (1-30 juz) dengan data tanda terima LPMQ.',
      '[X]  3. Telaah kaidah rasm Usmani standar Indonesia, kelengkapan harakat, tanda waqaf, dan tanda baca.',
      '[X]  4. Tuangkan seluruh butir telaah ke dalam Berita Acara Hasil Verifikasi Naskah Master Mushaf Al-Qur\'an.',
      '[X]  5. Tuntaskan telaah dan sampaikan rekomendasi (Lolos / Perlu Perbaikan) sesuai batas waktu SLA (2 hari kerja).',
    ];

    let sopY = y - 28;
    for (const item of sops) {
      page.drawText(item, { x: margin + 12, y: sopY, font, size: 7.5, color: black });
      sopY -= 13;
    }
    y -= sopBoxH + 8;

    // 5. Catatan / Arahan Khusus
    const noteText = safeText(
      content.notes
        ? (content.reassignment_reason ? `[Pengalihan Tugas: ${content.reassignment_reason}] ${content.notes}` : content.notes)
        : (content.reassignment_reason
            ? `Pengalihan Tugas: ${content.reassignment_reason}. Laksanakan telaah sesuai SOP.`
            : 'Laksanakan verifikasi administrasi dan teknis naskah master fisik secara cermat dan seksama sesuai SOP Pentashihan Mushaf Al-Qur\'an.'),
      font
    );

    const noteBoxH = 50;
    page.drawRectangle({
      x: margin,
      y: y - noteBoxH,
      width: contentWidth,
      height: noteBoxH,
      color: rgb(1, 1, 1),
      borderColor: tableBorder,
      borderWidth: 0.5,
    });
    drawSectionHeader('4. CATATAN / INSTRUKSI KHUSUS', y, contentWidth);

    page.drawText(noteText.slice(0, 240), {
      x: margin + 12,
      y: y - 30,
      font: italic,
      size: 7.5,
      color: black,
    });
    if (noteText.length > 240) {
      page.drawText(noteText.slice(240, 480), {
        x: margin + 12,
        y: y - 42,
        font: italic,
        size: 7.5,
        color: black,
      });
    }
    y -= noteBoxH + 20;

    // Penandatangan Disposisi
    const signX = 595 - margin - 200;
    page.drawText(`Jakarta, ${dateLabel}`, { x: signX, y, font, size: 8, color: black });
    y -= 12;
    page.drawText('Petugas Penugasan / Helper Admin,', { x: signX, y, font: bold, size: 8, color: black });
    y -= 10;
    page.drawText('Lajnah Pentashihan Mushaf Al-Qur\'an', { x: signX, y, font, size: 7.5, color: black });
    y -= 44;
    page.drawText(safeText(content.assigned_by_name || 'Helper Admin LPMQ', bold), { x: signX, y, font: bold, size: 8.5, color: black });

    // Footer Catatan Resmi
    const footerY = 32;
    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: 595 - margin, y: footerY + 10 },
      thickness: 0.5,
      color: tableBorder,
    });
    page.drawText('Dokumen Lembar Disposisi Resmi Kedinasan LPMQ Kementerian Agama RI.', {
      x: margin,
      y: footerY + 2,
      size: 6.5,
      font: italic,
      color: darkGray,
    });
    page.drawText('Otomatis dicatat dan diaudit dalam Sistem Informasi Penjaminan Mutu & Pentashihan Mushaf Al-Qur\'an.', {
      x: margin,
      y: footerY - 6,
      size: 6.5,
      font: italic,
      color: darkGray,
    });

  } else if (['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(document.document_type)) {
    // Header Surat Resmi
    const colRightX = 595 - margin - 180;
    page.drawText(`Jakarta, ${dateLabel}`, { x: colRightX, y, font, size: 8.5, color: black });
    y -= 4;

    const letterMetas = [
      ['Nomor', document.document_no || 'Belum diberi nomor'],
      ['Sifat', 'Biasa'],
      ['Lampiran', content.billing_file_id ? '1 (satu) berkas billing SIMPONI' : '-'],
      ['Hal', content.decision === 'PASSED' ? 'Pemberitahuan Hasil Verifikasi Lolos & Billing PNBP' : 'Pemberitahuan Hasil Verifikasi (Perlu Perbaikan)'],
    ];

    for (const [lLabel, lVal] of letterMetas) {
      page.drawText(lLabel, { x: margin, y, font, size: 8.5, color: black });
      page.drawText(':', { x: margin + 55, y, font, size: 8.5, color: black });
      page.drawText(safeText(lVal, lLabel === 'Nomor' ? bold : font), { x: margin + 65, y, font: lLabel === 'Nomor' ? bold : font, size: 8.5, color: black });
      y -= 13;
    }
    y -= 8;

    // Alamat Penerima
    page.drawText(`Yth. Pimpinan ${safeText(content.publisher_name || 'Penerbit', bold)}`, { x: margin, y, font: bold, size: 8.5, color: black });
    y -= 12;
    page.drawText(`di ${safeText(content.publisher_address || 'Tempat', font)}`, { x: margin, y, font, size: 8.5, color: black });
    y -= 16;

    line("Assalamu'alaikum wr. wb.");
    y -= 6;

    for (const paragraph of String(content.letter_text || content.notes || '').split(/\r?\n/)) {
      if (paragraph.trim()) {
        line(paragraph);
        y -= 4;
      } else {
        y -= 6;
      }
    }

    if (content.decision === 'PASSED' && content.billing_no) {
      y -= 10;
      // Kotak Rincian Billing PNBP Resmi
      const boxStartY = y;
      const boxH = 68;
      page.drawRectangle({
        x: margin,
        y: boxStartY - boxH,
        width: contentWidth,
        height: boxH,
        borderColor: tableBorder,
        borderWidth: 0.8,
      });

      page.drawText('INFORMASI PEMBAYARAN PNBP (SIMPONI KEMENAG RI)', {
        x: margin + 10,
        y: boxStartY - 14,
        font: bold,
        size: 8,
        color: darkGreen,
      });

      page.drawText(`Kode Billing SIMPONI : ${safeText(content.billing_no, bold)}`, {
        x: margin + 10,
        y: boxStartY - 28,
        font: bold,
        size: 8.5,
        color: black,
      });

      page.drawText(`Jumlah Tagihan         : Rp ${Number(content.billing_amount || 0).toLocaleString('id-ID')}`, {
        x: margin + 10,
        y: boxStartY - 40,
        font,
        size: 8,
        color: black,
      });

      const expDate = content.billing_expires_at
        ? new Date(content.billing_expires_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
        : '7 (tujuh) hari kalender';
      page.drawText(`Batas Waktu Bayar    : ${expDate}`, {
        x: margin + 10,
        y: boxStartY - 52,
        font,
        size: 7.5,
        color: darkGray,
      });

      y = boxStartY - boxH - 12;
      line('Gunakan kode billing di atas untuk melakukan penyetoran PNBP melalui teller bank, ATM, atau internet banking, kemudian unggah bukti NTPN sah pada portal LPMQ.');
      y -= 6;
    }

    line('Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.');
    y -= 6;
    line("Wassalamu'alaikum wr. wb.");
    y -= 22;

    // Tanda Tangan Dua Kolom
    const signLeftX = margin + 10;
    const signRightX = 595 - margin - 200;

    page.drawText('Verifikator Pemeriksa,', { x: signLeftX, y, font, size: 8, color: black });
    page.drawText('Kepala Lajnah Pentashihan Mushaf Al-Qur\'an,', { x: signRightX, y, font: bold, size: 8, color: black });
    y -= 45;

    page.drawText(safeText(content.verifier_name || '-', bold), { x: signLeftX, y, font: bold, size: 8, color: black });
    page.drawText(draft ? '(Menunggu persetujuan)' : safeText(approver?.name || '-', bold), { x: signRightX, y, font: bold, size: 8, color: black });
    y -= 10;
    page.drawText('NIP. ........................................', { x: signLeftX, y, font, size: 7.5, color: darkGray });
    if (!draft && approver) {
      page.drawText('NIP. ' + (approver.nip || '........................................'), { x: signRightX, y, font, size: 7.5, color: darkGray });
    }

  } else if (document.document_type === 'BERITA_ACARA_VERIFIKASI') {
    // BERITA ACARA HASIL VERIFIKASI NASKAH MASTER
    const baTitle1 = 'BERITA ACARA';
    const baTitle2 = 'HASIL VERIFIKASI NASKAH MASTER';
    page.drawText(baTitle1, {
      x: (595 - bold.widthOfTextAtSize(baTitle1, 10)) / 2,
      y,
      font: bold,
      size: 10,
      color: black,
    });
    y -= 13;
    page.drawText(baTitle2, {
      x: (595 - bold.widthOfTextAtSize(baTitle2, 10)) / 2,
      y,
      font: bold,
      size: 10,
      color: black,
    });
    y -= 14;

    const docNoText = `Nomor: ${safeText(document.document_no || 'Belum diberi nomor', bold)}`;
    page.drawText(docNoText, {
      x: (595 - bold.widthOfTextAtSize(docNoText, 9)) / 2,
      y,
      font: bold,
      size: 9,
      color: darkGreen,
    });
    y -= 18;

    const introBa = `Pada hari ini ${dateLabel}, telah dilaksanakan pemeriksaan dan telaah terhadap naskah master Mushaf Al-Qur'an sebagai berikut:`;
    page.drawText(introBa, { x: margin, y, font, size: 8, color: black });
    y -= 15;

    const specs = [
      ['Nama Penerbit', content.publisher_name || '-'],
      ['ID Penerbit', content.publisher_id ? String(content.publisher_id).slice(0, 8) : '-'],
      ['Nama Produk/Mushaf', content.title || '-'],
      ['Nomor pendaftaran mushaf', content.registration_no || '-'],
      ['Jenis pendaftaran mushaf', content.category_label || 'Tanda tashih mushaf baru'],
    ];

    for (const [sLabel, sVal] of specs) {
      page.drawText(sLabel, { x: margin, y, font, size: 8, color: black });
      page.drawText(':', { x: margin + 140, y, font, size: 8, color: black });
      page.drawText(safeText(sVal, font), { x: margin + 150, y, font, size: 8, color: black });
      y -= 13;
    }
    y -= 6;

    page.drawText('Dengan hasil pemeriksaan dan telaah sebagai berikut:', { x: margin, y, font, size: 8.5, color: black });
    y -= 12;

    const checkRows = [
      ['1.', 'Kelengkapan Juz', ['COMPLETENESS_JUZ', 'REGISTRATION_DATA']],
      ['2.', 'Kelengkapan Surah', ['COMPLETENESS_SURAH', 'DIGITAL_FILES']],
      ['3.', 'Urutan Halaman', ['PAGE_ORDER', 'PHYSICAL_MASTER']],
      ['4.', 'Kesesuaian Dengan Kaidah Penulisan Mushaf Standar Indonesia', ['MSI_CONFORMITY', 'MANUSCRIPT_CONTENT']],
      ['5.', 'Kesuaian dengan kaidah tajwid warna', ['TAJWID_COLOR', 'MANUSCRIPT_CONTENT']],
      ['6.', 'Kesesuaian dengan terjemah kemenag', ['TRANSLATION_KEMENAG', 'MANUSCRIPT_CONTENT']],
      ['7.', "Kesesuaian dengan pedoman penulisan Al-Qur'an Braille Kemenag.", ['BRAILLE_PEDOMAN', 'MANUSCRIPT_CONTENT']],
      ['8.', 'Kesesuaian Dengan Pedoman Transliterasi', ['TRANSLITERATION_PEDOMAN', 'MANUSCRIPT_CONTENT']],
    ];

    const col1W = 26;
    const col2W = 310;
    const col3W = 55;
    const thH = 17;

    page.drawRectangle({ x: margin, y: y - thH, width: contentWidth, height: thH, borderColor: tableBorder, borderWidth: 0.8 });
    page.drawText('No', { x: margin + 6, y: y - 11.5, font: bold, size: 8, color: black });
    page.drawText('Jenis Pemeriksaan', { x: margin + col1W + 6, y: y - 11.5, font: bold, size: 8, color: black });
    page.drawText('Ceklis', { x: margin + col1W + col2W + 10, y: y - 11.5, font: bold, size: 8, color: black });
    page.drawText('Keterangan', { x: margin + col1W + col2W + col3W + 10, y: y - 11.5, font: bold, size: 8, color: black });
    y -= thH;

    const checklistData = Array.isArray(content.checklist) ? content.checklist : [];

    for (const [no, label, codes] of checkRows) {
      const rowH = 16.5;
      const matched = checklistData.find(c => Array.isArray(codes) ? codes.includes(c.code) : c.code === codes);
      const isSesuai = content.decision === 'PASSED' || (matched && matched.result === 'SESUAI');
      const isNa = matched?.result === 'TIDAK_BERLAKU';
      const note = matched?.notes || (isSesuai ? 'Sesuai' : (isNa ? 'Tidak Berlaku' : '-'));

      page.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, borderColor: tableBorder, borderWidth: 0.5 });
      page.drawLine({ start: { x: margin + col1W, y }, end: { x: margin + col1W, y: y - rowH }, thickness: 0.5, color: tableBorder });
      page.drawLine({ start: { x: margin + col1W + col2W, y }, end: { x: margin + col1W + col2W, y: y - rowH }, thickness: 0.5, color: tableBorder });
      page.drawLine({ start: { x: margin + col1W + col2W + col3W, y }, end: { x: margin + col1W + col2W + col3W, y: y - rowH }, thickness: 0.5, color: tableBorder });

      page.drawText(no, { x: margin + 6, y: y - 11.5, font, size: 7.5, color: black });
      page.drawText(safeText(label, font), { x: margin + col1W + 6, y: y - 11.5, font, size: 7.5, color: black });
      page.drawText(isSesuai ? '[ V ]' : '[   ]', { x: margin + col1W + col2W + 14, y: y - 11.5, font: bold, size: 7.5, color: darkGreen });
      page.drawText(safeText(note, font), { x: margin + col1W + col2W + col3W + 8, y: y - 11.5, font, size: 7.5, color: black });
      y -= rowH;
    }
    y -= 12;

    const isLolos = content.decision === 'PASSED';
    page.drawText('Naskah tersebut dinyatakan', { x: margin, y, font: bold, size: 8.5, color: black });
    y -= 13;
    page.drawText(`[ ${isLolos ? 'V' : ' '} ]  Lolos verifikasi           [ ${!isLolos ? 'V' : ' '} ]  Tidak lolos verifikasi`, { x: margin, y, font: bold, size: 8.5, color: black });
    y -= 16;

    page.drawText("Rencana tindak lanjut Pelayanan Pentashihan Mushaf Al-Qur'an sebagai berikut:", { x: margin, y, font: bold, size: 8, color: black });
    y -= 12;
    page.drawText(`[ ${!isLolos ? 'V' : ' '} ] Dikembalikan ke penerbit`, { x: margin, y, font, size: 8, color: black });
    y -= 11;
    page.drawText(`[ ${isLolos ? 'V' : ' '} ] Dilakukan pentashihan dengan ketentuan sebagai berikut:`, { x: margin, y, font, size: 8, color: black });
    y -= 11;
    page.drawText('    Waktu Layanan Pentashihan : 30 hari kerja', { x: margin + 15, y, font, size: 7.5, color: black });
    y -= 11;
    page.drawText('    Jumlah Surat Tanda Tashih : 1 Surat Tanda Tashih', { x: margin + 15, y, font, size: 7.5, color: black });
    y -= 11;
    if (content.billing_no) {
      page.drawText(`    Ketentuan PNBP : Kode Billing ${content.billing_no} | Total Rp ${Number(content.billing_amount || 0).toLocaleString('id-ID')}`, { x: margin + 15, y, font: bold, size: 7.5, color: black });
    } else {
      page.drawText('    Ketentuan PNBP : Sesuai tarif ketetapan PNBP PP Kemenag RI', { x: margin + 15, y, font, size: 7.5, color: black });
    }
    y -= 18;

    page.drawText('Demikian Berita Acara ini dibuat agar dapat dipergunakan sebagaimana mestinya.', { x: margin, y, font, size: 8, color: black });
    y -= 16;

    const signRightX = 595 - margin - 180;
    page.drawText(`Jakarta, ${dateLabel}`, { x: signRightX, y, font, size: 8, color: black });
    y -= 11;
    page.drawText('Mengetahui :', { x: signRightX, y, font: bold, size: 8, color: black });
    y -= 11;
    page.drawText('Verifikator LPMQ,', { x: signRightX, y, font: bold, size: 8, color: black });
    y -= 42;
    page.drawText(safeText(content.verifier_name || 'Verifikator', bold), { x: signRightX, y, font: bold, size: 8, color: black });
    y -= 10;
    page.drawText(`NIP. ${content.verifier_nip || '........................................'}`, { x: signRightX, y, font, size: 7.5, color: darkGray });

  } else {
    // Dokumen Jenis Lain
    const docTitle = label[document.document_type] || document.document_type;
    page.drawText(docTitle, {
      x: (595 - bold.widthOfTextAtSize(docTitle, 11)) / 2,
      y,
      font: bold,
      size: 11,
      color: black,
    });
    y -= 14;

    page.drawText(`Nomor: ${safeText(document.document_no || 'Belum diberi nomor', bold)}`, {
      x: (595 - bold.widthOfTextAtSize(`Nomor: ${document.document_no || 'Belum diberi nomor'}`, 9.5)) / 2,
      y,
      font: bold,
      size: 9.5,
      color: darkGreen,
    });
    y -= 18;

    line(`Nomor Registrasi : ${content.registration_no || '-'}`);
    line(`Judul Naskah     : ${content.title || '-'}`);
    line(`Keputusan        : ${content.decision || '-'}`);
    line(`Verifikator      : ${content.verifier_name || '-'}`);
    y -= 10;

    for (const paragraph of String(content.letter_text || content.notes || '').split(/\r?\n/)) {
      line(paragraph || ' ');
      y -= 3;
    }
  }

  y -= 14;
  line(draft ? 'Status Dokumen: Draf (Belum Ditetapkan / Belum Disetujui)' : 'Status Dokumen: Disetujui dan Ditetapkan Secara Elektronik', true, 8);

  if (!draft) {
    line(`Pejabat Penyetuju : ${approver?.name || '-'}`, false, 7.5);
    line(`Waktu Persetujuan : ${approvedAt?.toISOString() || '-'}`, false, 7.5);
    const qrData = await QRCode.toDataURL(verificationUrl(document.qr_token), { errorCorrectionLevel: 'M', margin: 1, width: 256 });
    const qr = await pdf.embedPng(Buffer.from(qrData.split(',')[1], 'base64'));
    if (y < 120) newPage();
    page.drawImage(qr, { x: margin, y: y - 75, width: 70, height: 70 });
    page.drawText('Pindai QR code ini untuk memeriksa keaslian dan status integritas dokumen pada arsip resmi LPMQ.', { x: margin + 80, y: y - 28, font, size: 7.5, color: darkGray });
    page.drawText('Dokumen diterbitkan secara elektronik oleh Sistem Informasi Layanan Pentashihan Mushaf Al-Qur\'an.', { x: margin + 80, y: y - 40, font: italic, size: 7, color: darkGray });
  }

  return Buffer.from(await pdf.save());
}

// Call inside the same database transaction that approves the document. The caller
// removes paths in createdFiles if that transaction fails.
export async function archiveVerificationPdf(tx, document, user, approvedAt, createdFiles) {
  const bytes = await renderVerificationPdf(document, { approver: user, approvedAt });
  const id = randomUUID();
  await mkdir(storageRoot, { recursive: true });
  const filename = path.join(storageRoot, id);
  await writeFile(filename, bytes, { flag: 'wx' });
  createdFiles.push(filename);
  await tx.storedFile.create({ data: {
    id, owner_id: user.id, mime_type: 'application/pdf', file_size: bytes.length, checksum: fileHash(bytes),
  } });
  return id;
}

export async function cleanupGeneratedFiles(filenames) {
  await Promise.all(filenames.map(name => unlink(name).catch(() => {})));
}

export async function readVerifiedPdf(document) {
  if (!document.file_id) fail(409, 'PDF final belum tersedia.');
  const file = await prisma.storedFile.findUnique({ where: { id: document.file_id } });
  if (!file || file.mime_type !== 'application/pdf') fail(409, 'Arsip PDF final tidak ditemukan.');
  let bytes;
  try { bytes = await readStoredFile(file.id); }
  catch (error) { if (error.code === 'ENOENT') fail(409, 'Arsip PDF final tidak ditemukan.'); throw error; }
  if (fileHash(bytes) !== file.checksum) fail(409, 'Integritas arsip PDF tidak cocok dengan checksum yang tersimpan.');
  return bytes;
}

export async function publicVerification(token, candidate = null) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) fail(404, 'Dokumen tidak ditemukan.');
  const doc = await prisma.verificationDocument.findUnique({ where: { qr_token: token }, include: {
    created_by: { select: { name: true } }, approved_by: { select: { name: true } },
  } });
  if (!doc || !doc.file_id || !doc.approved_at) fail(404, 'Dokumen belum diterbitkan untuk verifikasi publik.');
  const archive = await prisma.storedFile.findUnique({ where: { id: doc.file_id } });
  let archiveMatches = false;
  if (archive?.mime_type === 'application/pdf') {
    try { archiveMatches = fileHash(await readStoredFile(archive.id)) === archive.checksum; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const superseded = await prisma.verificationDocument.findFirst({ where: {
    registration_id: doc.registration_id, document_type: doc.document_type, version: { gt: doc.version },
    approved_at: { not: null },
  }, select: { version: true }, orderBy: { version: 'desc' } });
  return {
    document_type: doc.document_type, document_no: doc.document_no, version: doc.version,
    status: doc.status, created_by: doc.created_by?.name || null,
    approved_by: doc.approved_by?.name || null, approved_at: doc.approved_at,
    superseded_by_version: superseded?.version || null,
    archive_integrity: archiveMatches ? 'MATCH' : 'MISMATCH',
    checked_file_integrity: candidate ? (archiveMatches && fileHash(candidate) === archive.checksum ? 'MATCH' : 'MISMATCH') : null,
    verification_type: 'LPMQ_INTERNAL',
  };
}
