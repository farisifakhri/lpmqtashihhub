import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function buildSuratPermohonanText({
  namaPenerbit = '........................................',
  idPenerbit = '....................',
  namaMushaf = '........................................',
  penanggungJawab = '........................................',
  materi = '',
  sizes = [],
  namaPercetakan = '........................................',
  alamatPercetakan = '........................................',
  rencanaPencetakan = '........................................',
  nomorSurat = '......................',
  tanggalSurat = null,
} = {}) {
  const dateStr = tanggalSurat || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const sizesFormatted = Array.isArray(sizes) && sizes.length > 0
    ? sizes.map((s, idx) => `   ${idx + 1}. Ukuran: ${s.panjang_cm && s.lebar_cm ? `${s.panjang_cm} x ${s.lebar_cm} cm` : '....................'} | Oplah: ${s.oplah ? Number(s.oplah).toLocaleString('id-ID') : '....................'} eksemplar`).join('\n')
    : `   1. Ukuran: 21 x 29,7 cm     oplah : 10.000 eksemplar\n   2. Ukuran: .................... oplah : ....................\n   3. Ukuran: .................... oplah : ....................`;

  const materiText = materi || '(cantumkan seluruh materi dalam mushaf. Contoh: terjemah dan terjemah perkata, transliterasi, kode tajwid, tajwid warna, hadis, asbabunnuzul, tafsir, pelajaran tajwid, dzikir, doa khotmil qur’an, asmaul husna, dll)';

  return `KOP SURAT RESMI PENERBIT
================================================================================

Nomor       : ${nomorSurat}                                 Jakarta, ${dateStr}
Lampiran    : Print out master mushaf Al-Qur’an dan bukti registrasi
Hal         : Permohonan Tanda Tashih

Yth. Kepala Lajnah Pentashihan Mushaf Al-Qur’an
BMBPSDM Kementerian Agama Republik Indonesia
di Jakarta

Assalamu’alaikum wr. wb.

Dengan hormat kami sampaikan bahwa kami dari penerbit ${namaPenerbit} dengan ID penerbit Al-Qur’an nomor ${idPenerbit} (nomor ID penerbit dapat dilihat pada aplikasi Layanan Tashih Online) bermaksud memohon Surat Tanda Tashih untuk mushaf Al-Qur’an ${namaMushaf} yang akan kami terbitkan. Adapun rincian mushaf yang akan kami terbitkan adalah sebagai berikut:

Nama Mushaf             : ${namaMushaf}
Penanggung Jawab Mushaf : ${penanggungJawab}
Materi dalam Mushaf     : ${materiText}
Rincian Ukuran & Oplah  :
${sizesFormatted}
Rencana Pencetakan      : ${rencanaPencetakan}
Nama Percetakan         : ${namaPercetakan}
Alamat Percetakan       : ${alamatPercetakan}

Demikian surat permohonan ini kami sampaikan, atas perhatian dan perkenannya kami ucapkan terima kasih.

Wassalamu’alaikum wr. wb.

Pimpinan Penerbit
${namaPenerbit}


(Tanda tangan, nama lengkap pimpinan, dan stempel basah penerbit)

--------------------------------------------------------------------------------
PETUNJUK KELENGKAPAN PENDAFTARAN TASHIH:
1. Surat ini wajib dicetak di atas kop surat resmi penerbit, ditandatangani oleh pimpinan penerbit, dan dibubuhi stempel basah resmi.
2. Surat yang telah ditandatangani dan distempel dipindai (scan berwarna) sebagai format PDF (maks. 10 MB) dan diunggah pada Langkah 3 (Berkas Persyaratan).
3. Naskah master mushaf Al-Qur’an dikirimkan ke Loket LPMQ (Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII Jakarta Timur) bersama bukti registrasi permohonan tanda tashih.
================================================================================`;
}

export function buildSuratPermohonanDocHtml({
  namaPenerbit = '........................................',
  idPenerbit = '....................',
  namaMushaf = '........................................',
  penanggungJawab = '........................................',
  materi = '',
  sizes = [],
  namaPercetakan = '........................................',
  alamatPercetakan = '........................................',
  rencanaPencetakan = '........................................',
  nomorSurat = '......................',
  tanggalSurat = null,
} = {}) {
  const dateStr = tanggalSurat || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const materiText = materi || '(cantumkan seluruh materi dalam mushaf. Contoh: terjemah dan terjemah perkata, transliterasi, kode tajwid, tajwid warna, hadis, asbabunnuzul, tafsir, pelajaran tajwid, dzikir, doa khotmil qur’an, asmaul husna, dll)';

  const ukuranRows = Array.isArray(sizes) && sizes.length > 0
    ? sizes.map((s, idx) => `<p style="margin: 0 0 2pt 0;">${idx + 1}. Ukuran: ${s.panjang_cm && s.lebar_cm ? `${s.panjang_cm} x ${s.lebar_cm} cm` : '....................'} &nbsp;|&nbsp; Oplah: ${s.oplah ? Number(s.oplah).toLocaleString('id-ID') : '....................'} eksemplar</p>`).join('')
    : `<p style="margin: 0 0 2pt 0;">1. 21 x 29,7 cm &nbsp;&nbsp;&nbsp;&nbsp; Oplah: 10.000 eksemplar</p><p style="margin: 0 0 2pt 0;">2. .................... &nbsp;&nbsp;&nbsp;&nbsp; Oplah: ....................</p><p style="margin: 0 0 2pt 0;">3. .................... &nbsp;&nbsp;&nbsp;&nbsp; Oplah: ....................</p>`;

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Surat Permohonan Tanda Tashih</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm;
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000;
    }
    p { margin: 0 0 6pt 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
    td { vertical-align: top; padding: 2pt 3pt; font-size: 12pt; }
  </style>
</head>
<body>
<div class="Section1">
  <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 6pt; margin-bottom: 14pt;">
    <p style="font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase;">[KOP SURAT RESMI PENERBIT]</p>
    <p style="font-size: 10pt; margin: 0; color: #555;">[Alamat Lengkap Kantor, Telepon, Email Resmi, dan Website]</p>
  </div>

  <table style="margin-bottom: 12pt;">
    <tr>
      <td style="width: 15%;">Nomor</td>
      <td style="width: 2%;">:</td>
      <td style="width: 48%;">${nomorSurat}</td>
      <td style="width: 35%; text-align: right;">Jakarta, ${dateStr}</td>
    </tr>
    <tr>
      <td>Lampiran</td>
      <td>:</td>
      <td colspan="2">Print out master mushaf Al-Qur’an dan bukti registrasi</td>
    </tr>
    <tr>
      <td>Hal</td>
      <td>:</td>
      <td colspan="2"><strong>Permohonan Tanda Tashih</strong></td>
    </tr>
  </table>

  <p style="margin-bottom: 12pt;">
    Yth. <strong>Kepala Lajnah Pentashihan Mushaf Al-Qur’an</strong><br/>
    BMBPSDM Kementerian Agama Republik Indonesia<br/>
    di Jakarta
  </p>

  <p style="margin-bottom: 8pt;">Assalamu’alaikum wr. wb.</p>

  <p style="text-align: justify; text-indent: 30pt; margin-bottom: 10pt;">
    Dengan hormat kami sampaikan bahwa kami dari penerbit <strong>${namaPenerbit}</strong> dengan ID penerbit Al-Qur’an nomor <strong>${idPenerbit}</strong> (nomor ID penerbit dapat dilihat pada aplikasi Layanan Tashih Online) bermaksud memohon Surat Tanda Tashih untuk mushaf Al-Qur’an <strong>${namaMushaf}</strong> yang akan kami terbitkan. Adapun rincian mushaf yang akan kami terbitkan adalah sebagai berikut:
  </p>

  <table style="margin-left: 15pt; width: 96%; margin-bottom: 12pt;">
    <tr>
      <td style="width: 30%;">Nama Mushaf</td>
      <td style="width: 3%;">:</td>
      <td style="width: 67%;"><strong>${namaMushaf}</strong></td>
    </tr>
    <tr>
      <td>Penanggung Jawab Mushaf</td>
      <td>:</td>
      <td>${penanggungJawab}</td>
    </tr>
    <tr>
      <td>Materi dalam Mushaf</td>
      <td>:</td>
      <td>${materiText}</td>
    </tr>
    <tr>
      <td>Ukuran &amp; Rencana Oplah</td>
      <td>:</td>
      <td>${ukuranRows}</td>
    </tr>
    <tr>
      <td>Rencana Pencetakan</td>
      <td>:</td>
      <td>${rencanaPencetakan}</td>
    </tr>
    <tr>
      <td>Nama Percetakan</td>
      <td>:</td>
      <td>${namaPercetakan}</td>
    </tr>
    <tr>
      <td>Alamat Percetakan</td>
      <td>:</td>
      <td>${alamatPercetakan}</td>
    </tr>
  </table>

  <p style="text-align: justify; text-indent: 30pt; margin-bottom: 14pt;">
    Demikian surat permohonan ini kami sampaikan, atas perhatian dan perkenannya kami ucapkan terima kasih.
  </p>

  <p style="margin-bottom: 10pt;">Wassalamu’alaikum wr. wb.</p>

  <table style="width: 100%; margin-top: 18pt;">
    <tr>
      <td style="width: 55%;"></td>
      <td style="width: 45%; text-align: center;">
        <p style="margin-bottom: 50pt;">
          Pimpinan Penerbit<br/>
          <strong>${namaPenerbit}</strong>
        </p>
        <p style="margin-bottom: 2pt; font-weight: bold; text-decoration: underline;">
          ( .......................................................... )
        </p>
        <p style="font-size: 10pt; color: #555;">Tanda tangan &amp; Stempel Basah</p>
      </td>
    </tr>
  </table>

  <div style="margin-top: 30pt; padding: 8pt; border: 1pt dashed #888; font-size: 9pt; color: #444; background-color: #f9f9f9;">
    <strong>Petunjuk Kelengkapan Berkas LPMQ Kemenag RI:</strong>
    <ol style="margin: 4pt 0 0 16pt; padding: 0;">
      <li>Surat ini dicetak pada kop surat resmi penerbit, ditandatangani oleh pimpinan, dan distempel basah.</li>
      <li>Surat dipindai (scan berwarna) sebagai berkas <strong>PDF</strong> (maksimal 10 MB) dan diunggah pada Langkah 3 formulir pendaftaran tashih online.</li>
      <li>Naskah master fisik mushaf Al-Qur’an dikirimkan ke loket pelayanan LPMQ bersama cetakan bukti registrasi pendaftaran.</li>
    </ol>
  </div>
</div>
</body>
</html>`;
}

export function downloadWordDoc(filename, htmlContent) {
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SuratPermohonanTemplateModal({
  isOpen,
  onClose,
  data = {},
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const letterText = buildSuratPermohonanText(data);
  const letterDocHtml = buildSuratPermohonanDocHtml(data);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = letterText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadDoc = () => {
    const filename = `Format-Surat-Permohonan-Tanda-Tashih-${(data.namaMushaf || 'Mushaf').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    downloadWordDoc(filename, letterDocHtml);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-line overflow-hidden my-8 max-h-[90vh] flex flex-col animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h3 id="template-modal-title" className="text-sm sm:text-base font-bold text-ink">
                Format Baku Surat Permohonan Tanda Tashih
              </h3>
              <p className="text-xs text-ink-muted">
                Standar resmi Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama RI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup jendela format surat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Styled Letter Paper */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-canvas/40">
          <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200 text-xs text-brand-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-brand-800 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Petunjuk:</strong> Unduh format surat Microsoft Word (<strong>.doc</strong>) di bawah ini atau salin teksnya. Cetak di atas kop resmi penerbit Anda, lengkapi data mushaf, bubuhkan tanda tangan pimpinan &amp; stempel basah, lalu <strong>scan sebagai PDF</strong> untuk diunggah pada Langkah 3.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-xl bg-white border border-line shadow-xs font-serif text-xs sm:text-sm text-ink space-y-4 leading-relaxed whitespace-pre-wrap select-all">
            {letterText}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 bg-surface">
          <span className="text-xs text-ink-muted font-sans">
            Format file unduhan: Microsoft Word (.doc)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-civic-success" />
                  <span className="text-civic-success">Format Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Salin Teks Format
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadDoc}
              className="text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh Dokumen (.doc)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
