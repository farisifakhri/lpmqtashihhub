import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CloudUpload, Download, FileCheck2, FileText, QrCode, RefreshCw, ScanLine, Search, Send, ShieldAlert, ShieldCheck, ShieldX,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/api/public.api';
import { sttTokenFromText } from '@/lib/stt-token';

const MAX_BYTES = 10 * 1024 * 1024;
const NO_PREVIEW = { uploaded: [], original: [] };
const STATUS_LABELS = { ISSUED: 'Berlaku', EXPIRED: 'Kedaluwarsa', REVOKED: 'Dicabut' };
const STEPS = [
  [CloudUpload, 'Unggah PDF STT', 'Berkas hanya diperiksa, tidak disimpan.'],
  [ScanLine, 'QR Code dibaca', 'Otomatis dari halaman surat.'],
  [FileCheck2, 'Dicocokkan', 'Dibandingkan dengan arsip resmi LPMQ.'],
];
const TONES = {
  success: { box: 'bg-brand-50 border-brand-100', icon: 'bg-brand-100 text-brand-700', title: 'text-brand-900' },
  warning: { box: 'bg-civic-warningSoft border-civic-warningLine', icon: 'bg-surface text-civic-warning', title: 'text-civic-warning' },
  danger: { box: 'bg-civic-dangerSoft border-civic-dangerLine', icon: 'bg-surface text-civic-danger', title: 'text-civic-danger' },
};

const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

// Sah hanya bila berkas identik dengan arsip DAN STT-nya masih berlaku.
const verdictOf = ({ checked_file_integrity: integrity, is_valid: isValid, status }) => {
  if (integrity !== 'MATCH') {
    return {
      tone: 'danger', Icon: ShieldX, title: 'Berkas BERBEDA dari STT asli di arsip LPMQ',
      text: `Isi berkas tidak sama dengan arsip resmi: berkas telah diubah, disimpan ulang dengan aplikasi lain, atau tidak berasal dari sistem LPMQ. ${isValid
        ? 'Yang berlaku adalah STT asli di bawah.'
        : `STT dengan nomor ini juga sudah ${status === 'REVOKED' ? 'dicabut' : 'kedaluwarsa'}, sehingga tidak berlaku lagi.`}`,
    };
  }
  if (!isValid) {
    return {
      tone: 'warning', Icon: ShieldAlert, title: `Berkas asli, tetapi STT ${status === 'REVOKED' ? 'sudah dicabut' : 'sudah kedaluwarsa'}`,
      text: 'Berkas identik dengan arsip resmi LPMQ, namun STT ini tidak berlaku lagi sehingga tidak dapat dipakai sebagai bukti tashih.',
    };
  }
  return {
    tone: 'success', Icon: ShieldCheck, title: 'Asli: berkas identik dengan STT asli di arsip LPMQ',
    text: 'Isi berkas sama persis byte demi byte dengan arsip resmi, dan STT masih berlaku.',
  };
};

// Object URL dilepas saat diganti atau halaman ditutup.
const useObjectUrl = (blob) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return undefined; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
};

const PreviewPanel = ({ title, pages, action, emptyText = 'Pratinjau tidak dapat ditampilkan pada peramban ini.' }) => (
  <figure className="space-y-3 rounded-2xl border border-line bg-surface p-3 sm:p-4">
    <figcaption className="flex items-center justify-between gap-2 text-sm font-semibold">
      <span>{title}</span>
      {action}
    </figcaption>
    {pages.length ? (
      <div className="max-h-[75vh] space-y-2 overflow-auto rounded-xl border border-line bg-canvas p-2">
        {pages.map((src, index) => (
          <img key={`${title}-${index}`} src={src} alt={`${title}, halaman ${index + 1}`} className="w-full rounded-md bg-white shadow-sm" />
        ))}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-muted">{emptyText}</p>
    )}
  </figure>
);

export const SttAuthenticityCheck = () => {
  const inputRef = useRef(null);
  const verdictRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | reading | checking | manual | done
  const [manualToken, setManualToken] = useState('');
  const [result, setResult] = useState(null);
  const [previews, setPreviews] = useState(NO_PREVIEW);
  const [originalBlob, setOriginalBlob] = useState(null);
  const [error, setError] = useState('');
  const originalUrl = useObjectUrl(originalBlob);
  const busy = phase === 'reading' || phase === 'checking';
  const statusText = { reading: 'Membaca QR Code pada berkas…', checking: 'Mencocokkan dengan arsip STT…' }[phase] || '';

  // Fokus ke kesimpulan agar hasil terlihat (dan terbaca pembaca layar) tanpa menggulir manual.
  useEffect(() => { if (phase === 'done') verdictRef.current?.focus(); }, [phase]);

  const pickFile = (picked) => {
    if (!picked || busy) return;
    setResult(null);
    setOriginalBlob(null);
    setPreviews(NO_PREVIEW);
    setManualToken('');
    setPhase('idle');
    if (!isPdf(picked) || picked.size > MAX_BYTES) {
      setFile(null);
      setError('Pilih berkas PDF berukuran maksimal 10 MB.');
      return;
    }
    setFile(picked);
    setError('');
  };

  const runCheck = async (token, source) => {
    setPhase('checking');
    setError('');
    try {
      // Berkas asli diambil paralel, tetapi kegagalannya (mis. belum dibuka untuk publik) tidak membatalkan vonis.
      const originalRequest = publicApi.getOriginalSttFile(token).catch(() => null);
      const data = await publicApi.checkSttFile(token, file);
      const blob = await originalRequest;
      const renderer = await import('@/lib/pdf-qr').then((lib) => lib.renderPdfPreview).catch(() => null);
      const preview = async (pdf) => {
        if (!pdf || !renderer) return [];
        try {
          return await renderer(await bytesOf(pdf));
        } catch {
          return []; // pratinjau gagal tidak membatalkan vonis
        }
      };
      const [uploaded, original] = await Promise.all([preview(file), preview(blob)]);
      setResult(data);
      setOriginalBlob(blob);
      setPreviews({ uploaded, original });
      setPhase('done');
    } catch (reason) {
      setError(reason.status === 404 && source === 'qr'
        ? 'QR Code pada berkas tidak terdaftar di arsip STT LPMQ, sehingga berkas ini patut diduga bukan STT resmi.'
        : reason.message || 'Dokumen tidak ditemukan di sistem.');
      setPhase(source === 'manual' ? 'manual' : 'idle');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file || busy) return;
    setPhase('reading');
    setError('');
    setResult(null);
    let token = null;
    let unreadable = false;
    try {
      const { findSttTokenInPdf } = await import('@/lib/pdf-qr');
      token = await findSttTokenInPdf(await bytesOf(file));
    } catch {
      unreadable = true;
    }
    if (token) {
      await runCheck(token, 'qr');
      return;
    }
    setError(unreadable
      ? 'Berkas PDF tidak dapat dibaca. Masukkan link atau token dari QR Code secara manual.'
      : 'QR Code verifikasi STT tidak terbaca pada berkas ini. Masukkan link atau token dari QR Code secara manual.');
    setPhase('manual');
  };

  const submitManual = (event) => {
    event.preventDefault();
    const token = sttTokenFromText(manualToken);
    if (!token) {
      setError('Format tidak dikenali. Tempel link verifikasi STT (…/verify-documents/…) atau tokennya.');
      return;
    }
    runCheck(token, 'manual');
  };

  const verdict = result && verdictOf(result);
  const tone = verdict && TONES[verdict.tone];
  const VerdictIcon = verdict?.Icon;

  return (
    <main className="min-h-screen bg-surface-subtle text-ink">
      <section className="lpmq-pattern-bg text-white">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pb-28 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Portal LPMQ
          </Link>
          <div className="mt-8 flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-300 ring-1 ring-white/15 sm:flex">
              <QrCode className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">LPMQ Kementerian Agama RI</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Cek Keaslian Surat Tanda Tashih</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
                Unggah PDF STT. Sistem membaca QR Code pada surat, mengambil STT asli dari arsip LPMQ, lalu mencocokkan berkas Anda dengan arsip tersebut.
              </p>
            </div>
          </div>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map(([Icon, title, desc], index) => (
              <li key={title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">{index + 1}. {title}</span>
                  <span className="block text-xs text-white/65">{desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-5xl space-y-6 px-4 pb-12 sm:-mt-20 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-brand-950/10">
          <div className="flex border-b border-line bg-canvas">
            <h2 className="-mb-px inline-flex items-center gap-2 border-b-2 border-brand-700 bg-surface px-5 py-3 text-sm font-semibold text-brand-fg">
              <FileCheck2 className="h-4 w-4" /> Keaslian Dokumen
            </h2>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              <div
                onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); pickFile(event.dataTransfer.files?.[0]); }}
                className={`rounded-xl border-2 border-dashed p-5 transition-colors ${dragging ? 'border-brand-700 bg-brand-50' : 'border-line-strong bg-canvas'}`}
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <CloudUpload className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold">Seret &amp; lepas PDF STT di sini</p>
                  <p className="text-xs text-ink-muted">atau pilih lewat tombol Cari File · format PDF, maksimal 10 MB</p>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm">
                    <FileText className={`h-4 w-4 shrink-0 ${file ? 'text-brand-700' : 'text-ink-muted'}`} />
                    {file ? (
                      <>
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-ink-muted">{formatSize(file.size)}</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">Dokumen</span>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy} icon={<Search className="h-4 w-4" />}>
                    Cari File
                  </Button>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  tabIndex={-1}
                  aria-label="Unggah PDF STT"
                  className="sr-only"
                  onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ''; }}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!file || busy}
                icon={busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              >
                {busy ? statusText : 'Kirim'}
              </Button>
              <p role="status" className="sr-only">{statusText}</p>
            </form>

            {error && (
              <p role="alert" className="rounded-lg border border-civic-dangerLine bg-civic-dangerSoft p-3 text-sm text-civic-danger">{error}</p>
            )}

            {phase === 'manual' && (
              <form onSubmit={submitManual} className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="manual-token" className="sr-only">Link atau token QR STT</label>
                <input
                  id="manual-token"
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                  placeholder="https://…/verify-documents/xxxxxxxx-xxxx-… atau token"
                  className="min-h-[44px] flex-1 rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-sm placeholder:font-sans placeholder:text-ink-muted focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30"
                />
                <Button type="submit" variant="secondary" icon={<QrCode className="h-4 w-4" />}>Periksa</Button>
              </form>
            )}
          </div>
        </section>

        {phase === 'done' && verdict && (
          <section className="space-y-6" aria-label="Hasil pemeriksaan">
            <div className={`flex items-start gap-4 rounded-2xl border p-5 sm:p-6 ${tone.box}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
                <VerdictIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 ref={verdictRef} tabIndex={-1} className={`text-lg font-bold outline-none ${tone.title}`}>{verdict.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{verdict.text}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {[
                ['Nomor STT', result.document_no],
                ['Judul naskah', result.title],
                ['Penerbit', result.publisher_name],
                ['Status STT', (
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${result.is_valid ? 'bg-brand-50 text-brand-900 ring-brand-100' : 'bg-civic-dangerSoft text-civic-danger ring-civic-dangerLine'}`}>
                    {STATUS_LABELS[result.status] || result.status}
                  </span>
                )],
                ['Tanggal terbit', formatDate(result.issued_at)],
                ['Berlaku sampai', formatDate(result.valid_until)],
              ].map(([name, value]) => (
                <div key={name} className="min-w-0">
                  <dt className="text-xs text-ink-muted">{name}</dt>
                  <dd className="mt-0.5 break-words font-semibold">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-4 lg:grid-cols-2">
              <PreviewPanel title="Berkas yang Anda unggah" pages={previews.uploaded} />
              <PreviewPanel
                title="STT asli dari arsip LPMQ"
                pages={previews.original}
                emptyText={originalBlob ? undefined : 'Berkas asli STT ini belum dapat ditampilkan untuk publik.'}
                action={originalUrl && (
                  <a
                    href={originalUrl}
                    download={`${(result.document_no || 'STT').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`}
                    className="inline-flex items-center gap-1 rounded-md text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  >
                    <Download className="h-4 w-4" /> Unduh STT asli
                  </a>
                )}
              />
            </div>
          </section>
        )}

        <p className="text-center text-xs text-ink-muted">
          Sistem Verifikasi Dokumen Publik — Lajnah Pentashihan Mushaf Al-Qur&apos;an (LPMQ)
        </p>
      </div>
    </main>
  );
};

export default SttAuthenticityCheck;
