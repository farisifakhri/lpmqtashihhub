import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
const labels = {
  NOTA_DINAS_VERIFIKASI: 'Nota Dinas penugasan verifikasi',
  SURAT_HASIL_VERIFIKASI: 'Surat hasil verifikasi',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'Surat pemberitahuan hasil verifikasi',
  BERITA_ACARA_VERIFIKASI: 'Berita acara verifikasi',
};

export default function InternalDocumentVerification() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    fetch(`${base}/public/verify-internal/${encodeURIComponent(token)}`)
      .then(async response => { if (!response.ok) throw new Error('Dokumen tidak ditemukan atau belum disetujui.'); return response.json(); })
      .then(result => setData(result.data))
      .catch(reason => setError(reason.message));
  }, [token]);

  const checkFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      setError('Pilih PDF berukuran maksimal 10 MB.');
      return;
    }
    setChecking(true);
    try {
      const response = await fetch(`${base}/public/verify-internal/${encodeURIComponent(token)}/check-file`, {
        method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file,
      });
      if (!response.ok) throw new Error('PDF belum dapat diperiksa.');
      setData((await response.json()).data);
    } catch (reason) { setError(reason.message); }
    finally { setChecking(false); }
  };

  return <main className="min-h-screen bg-surface-subtle px-4 py-12 text-ink">
    <article className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm space-y-5">
      <header><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">LPMQ Kementerian Agama RI</p>
        <h1 className="mt-2 text-2xl font-bold">Verifikasi dokumen internal</h1>
        <p className="mt-2 text-sm text-ink-muted">Status di bawah berasal dari catatan sistem saat halaman ini dibuka. QR ini bukan tanda tangan elektronik tersertifikasi.</p></header>
      {error && <p role="alert" className="rounded-lg bg-civic-dangerSoft p-3 text-sm text-danger">{error}</p>}
      {!data && !error && <p role="status">Memeriksa dokumen…</p>}
      {data && <>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {[
            ['Dokumen', labels[data.document_type] || data.document_type],
            ['Nomor', data.document_no || 'Belum ada'],
            ['Versi', data.version],
            ['Status saat ini', data.status],
            ['Pembuat', data.created_by || '—'],
            ['Penyetuju', data.approved_by || '—'],
            ['Waktu persetujuan', data.approved_at ? new Date(data.approved_at).toLocaleString('id-ID') : '—'],
            ['Integritas arsip', data.archive_integrity === 'MATCH' ? 'Cocok dengan checksum tersimpan' : 'Tidak cocok / arsip tidak tersedia'],
            ...(data.superseded_by_version ? [['Versi pengganti', data.superseded_by_version]] : []),
            ...(data.checked_file_integrity ? [['PDF yang diperiksa', data.checked_file_integrity === 'MATCH' ? 'Cocok dengan arsip' : 'Tidak cocok dengan arsip']] : []),
          ].map(([name, value]) => <div key={name}><dt className="text-ink-muted">{name}</dt><dd className="font-semibold break-words">{value}</dd></div>)}
        </dl>
        <label className="block rounded-xl border border-dashed border-line p-4 text-sm">
          <span className="block font-semibold">Bandingkan PDF yang Anda pegang</span>
          <span className="block text-ink-muted mb-2">Berkas diperiksa sementara; sistem membandingkan checksum dengan arsip final.</span>
          <input type="file" accept="application/pdf,.pdf" onChange={checkFile} disabled={checking} className="block w-full text-sm" />
        </label>
      </>}
    </article>
  </main>;
}
