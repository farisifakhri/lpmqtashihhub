import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function buildSuratPendaftaranText({
  namaPenerbit = '........................................',
  jenisBadanHukum = 'Perusahaan / Yayasan / Lembaga',
  namaPimpinan = '........................................',
  jabatan = 'Direktur / Pimpinan / Ketua',
  alamatKantor = '................................................................................',
  nomorTelepon = '..............................',
  emailResmi = '..............................',
  npwp = '..............................',
  nib = '..............................',
  nomorSurat = '......................',
  tanggalSurat = null,
} = {}) {
  const dateStr = tanggalSurat || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  return `KOP SURAT RESMI LEMBAGA / BADAN HUKUM PENERBIT
================================================================================

Nomor       : ${nomorSurat}                                 Jakarta, ${dateStr}
Lampiran    : Dokumen Persyaratan Legalitas Penerbit
Hal         : Permohonan Pendaftaran Akun Penerbit Mushaf Al-Qur'an

Yth. Kepala Lajnah Pentashihan Mushaf Al-Qur’an (LPMQ)
Badan Litbang dan Diklat / BMBPSDM Kementerian Agama Republik Indonesia
Gedung Bayt Al-Qur’an & Museum Istiqlal, TMII
Jakarta Timur

Assalamu’alaikum wr. wb.

Dengan hormat, yang bertanda tangan di bawah ini:
Nama Lengkap        : ${namaPimpinan}
Jabatan             : ${jabatan}
Bertindak atas nama : ${namaPenerbit} (${jenisBadanHukum})
Alamat Kantor       : ${alamatKantor}
Nomor Kontak / WA   : ${nomorTelepon}
Alamat Email Resmi  : ${emailResmi}
NPWP Badan Hukum    : ${npwp}
NIB (jika ada)      : ${nib}

Dengan ini kami mengajukan permohonan pendaftaran sebagai Penerbit Mushaf Al-Qur'an terdaftar pada Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama Republik Indonesia, guna memperoleh hak akses dan Nomor Induk Penerbit (ID Penerbit) pada Sistem Informasi Layanan Pentashihan Al-Qur'an Online.

Sebagai bahan verifikasi dan kelengkapan administrasi, kami lampirkan dokumen persyaratan legalitas resmi sebagai berikut:
1. Salinan Akta Notaris Pendirian Badan Hukum dan SK Pengesahan Kemenkumham RI
2. Salinan Nomor Induk Berusaha (NIB) / SIUP / TDP yang masih berlaku
3. Salinan Nomor Pokok Wajib Pajak (NPWP) Badan Usaha / Lembaga
4. Dokumen Profil Perusahaan / Yayasan / Lembaga Penerbit
5. Salinan KTP Pimpinan / Penanggung Jawab Resmi

Demikian surat permohonan pendaftaran ini kami buat dengan sebenarnya dan penuh rasa tanggung jawab. Atas perhatian, arahan, dan perkenan Bapak Kepala LPMQ, kami ucapkan terima kasih.

Wassalamu’alaikum wr. wb.

Pimpinan Penerbit
${namaPenerbit}


(Tanda tangan pimpinan, nama terang, dan stempel basah resmi)

--------------------------------------------------------------------------------
PETUNJUK PENDAFTARAN AKUN PENERBIT:
1. Surat dicetak di atas kop surat resmi badan hukum penerbit.
2. Ditandatangani oleh pimpinan/penanggung jawab yang sah dan dibubuhi stempel basah.
3. Dipindai (scan berwarna) ke dalam format PDF (maksimal 500 KB).
4. Diunggah pada kolom "Surat Permohonan Pendaftaran Penerbit" pada portal pendaftaran akun LPMQ.
================================================================================`;
}

export function buildSuratPendaftaranDocHtml({
  namaPenerbit = '........................................',
  jenisBadanHukum = 'Perusahaan / Yayasan / Lembaga',
  namaPimpinan = '........................................',
  jabatan = 'Direktur / Pimpinan / Ketua',
  alamatKantor = '................................................................................',
  nomorTelepon = '..............................',
  emailResmi = '..............................',
  npwp = '..............................',
  nib = '..............................',
  nomorSurat = '......................',
  tanggalSurat = null,
} = {}) {
  const dateStr = tanggalSurat || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Surat Permohonan Pendaftaran Akun Penerbit</title>
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
    <p style="font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase;">[KOP SURAT RESMI BADAN HUKUM PENERBIT]</p>
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
      <td colspan="2">Dokumen Persyaratan Legalitas Penerbit</td>
    </tr>
    <tr>
      <td>Hal</td>
      <td>:</td>
      <td colspan="2"><strong>Permohonan Pendaftaran Akun Penerbit Mushaf Al-Qur'an</strong></td>
    </tr>
  </table>

  <p style="margin-bottom: 12pt;">
    Yth. <strong>Kepala Lajnah Pentashihan Mushaf Al-Qur’an (LPMQ)</strong><br/>
    Badan Litbang dan Diklat / BMBPSDM Kementerian Agama Republik Indonesia<br/>
    Gedung Bayt Al-Qur’an &amp; Museum Istiqlal, TMII, Jakarta Timur
  </p>

  <p style="margin-bottom: 8pt;">Assalamu’alaikum wr. wb.</p>

  <p style="text-align: justify; text-indent: 30pt; margin-bottom: 10pt;">
    Dengan hormat, yang bertanda tangan di bawah ini:
  </p>

  <table style="margin-left: 15pt; width: 96%; margin-bottom: 12pt;">
    <tr>
      <td style="width: 30%;">Nama Lengkap</td>
      <td style="width: 3%;">:</td>
      <td style="width: 67%;"><strong>${namaPimpinan}</strong></td>
    </tr>
    <tr>
      <td>Jabatan</td>
      <td>:</td>
      <td>${jabatan}</td>
    </tr>
    <tr>
      <td>Bertindak atas nama</td>
      <td>:</td>
      <td><strong>${namaPenerbit}</strong> (${jenisBadanHukum})</td>
    </tr>
    <tr>
      <td>Alamat Kantor</td>
      <td>:</td>
      <td>${alamatKantor}</td>
    </tr>
    <tr>
      <td>Nomor Kontak / WA</td>
      <td>:</td>
      <td>${nomorTelepon}</td>
    </tr>
    <tr>
      <td>Alamat Email Resmi</td>
      <td>:</td>
      <td>${emailResmi}</td>
    </tr>
    <tr>
      <td>NPWP Badan Hukum</td>
      <td>:</td>
      <td>${npwp}</td>
    </tr>
    <tr>
      <td>NIB (jika ada)</td>
      <td>:</td>
      <td>${nib}</td>
    </tr>
  </table>

  <p style="text-align: justify; text-indent: 30pt; margin-bottom: 10pt;">
    Dengan ini kami mengajukan permohonan pendaftaran sebagai Penerbit Mushaf Al-Qur'an terdaftar pada Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama Republik Indonesia, guna memperoleh hak akses dan Nomor Induk Penerbit (ID Penerbit) pada Sistem Informasi Layanan Pentashihan Al-Qur'an Online.
  </p>

  <p style="margin-bottom: 4pt;">
    Sebagai bahan verifikasi dan kelengkapan administrasi, kami lampirkan dokumen persyaratan legalitas resmi sebagai berikut:
  </p>
  <ol style="margin: 0 0 10pt 20pt; padding: 0;">
    <li>Salinan Akta Notaris Pendirian Badan Hukum dan SK Pengesahan Kemenkumham RI</li>
    <li>Salinan Nomor Induk Berusaha (NIB) / SIUP / TDP yang masih berlaku</li>
    <li>Salinan Nomor Pokok Wajib Pajak (NPWP) Badan Usaha / Lembaga</li>
    <li>Dokumen Profil Perusahaan / Yayasan / Lembaga Penerbit</li>
    <li>Salinan KTP Pimpinan / Penanggung Jawab Resmi</li>
  </ol>

  <p style="text-align: justify; text-indent: 30pt; margin-bottom: 14pt;">
    Demikian surat permohonan pendaftaran ini kami buat dengan sebenarnya dan penuh rasa tanggung jawab. Atas perhatian, arahan, dan perkenan Bapak Kepala LPMQ, kami ucapkan terima kasih.
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
    <strong>Petunjuk Pendaftaran Akun Penerbit:</strong>
    <ol style="margin: 4pt 0 0 16pt; padding: 0;">
      <li>Surat dicetak di atas kop surat resmi badan hukum penerbit.</li>
      <li>Ditandatangani oleh pimpinan/penanggung jawab yang sah dan dibubuhi stempel basah.</li>
      <li>Dipindai (scan berwarna) ke dalam format <strong>PDF</strong> (maksimal 500 KB).</li>
      <li>Diunggah pada formulir pendaftaran akun penerbit online.</li>
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

export function SuratPendaftaranTemplateModal({
  isOpen,
  onClose,
  data = {},
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const letterText = buildSuratPendaftaranText(data);
  const letterDocHtml = buildSuratPendaftaranDocHtml(data);

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
    const filename = `Format-Surat-Pendaftaran-Penerbit-${(data.namaPenerbit || 'Penerbit').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    downloadWordDoc(filename, letterDocHtml);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-pendaftaran-modal-title"
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
              <Building2 className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h3 id="template-pendaftaran-modal-title" className="text-sm sm:text-base font-bold text-ink">
                Format Baku Surat Permohonan Pendaftaran Penerbit
              </h3>
              <p className="text-xs text-ink-muted">
                Standar resmi pengajuan akun penerbit mushaf Al-Qur'an pada LPMQ Kemenag RI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal format surat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-canvas/40">
          <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200 text-xs text-brand-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-brand-800 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Petunjuk:</strong> Unduh format surat Microsoft Word (<strong>.doc</strong>) di bawah ini atau salin teksnya. Cetak pada kop resmi badan usaha / lembaga Anda, lengkapi data penanggung jawab, bubuhkan tanda tangan pimpinan &amp; stempel basah, lalu <strong>scan sebagai PDF</strong> (maks. 500 KB) untuk diunggah pada formulir.
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
