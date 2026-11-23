import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckSquare, Filter, Inbox, RefreshCw, Search, Stamp,
} from 'lucide-react';
import { parafApi } from '@/api/paraf.api';
import { useAuth } from '@/features/auth/AuthContext';
import { PARAF_TYPES, ParafCheckout, ParafSelectBox, parafKey } from './ParafCheckout';

// Warna & ikon per alur; urutan = urutan chip segmentasi.
const PEOPLE_BADGE = {
  Verifikator: 'bg-brand-50 text-brand-900 border-brand-200',
  Distributor: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
};

const keyOf = parafKey;
const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '-');
const waitingDays = (value) => (value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 864e5)) : 0);

/** Titik progres paraf: terisi = Pemaraf yang sudah memaraf. */
const ParafDots = ({ done, required }) => (
  <span className="inline-flex items-center gap-2">
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: required }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < done ? 'bg-brand-600' : 'border-2 border-line-strong'}`} />
      ))}
    </span>
    <span className="text-xs font-semibold text-ink">{done}/{required}</span>
    <span className="sr-only">Pemaraf sudah memaraf</span>
  </span>
);

/**
 * Antrean Paraf: seluruh dokumen yang menunggu paraf Pemaraf yang login. Pemaraf mencentang beberapa
 * dokumen lalu "checkout" sekali untuk memaraf semuanya; tiap paraf tetap lewat endpoint alurnya sendiri.
 */
export const ParafQueuePage = () => {
  const { currentUser } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [segment, setSegment] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    return parafApi.queue()
      .then((res) => setState({ loading: false, error: '', items: Array.isArray(res?.data) ? res.data : [] }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err?.message || 'Antrean paraf belum dapat dimuat.' })));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => state.items.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {}), [state.items]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.items.filter((item) => (segment === 'ALL' || item.type === segment)
      && (!q || [item.reference, item.title, item.publisher, item.detail].some((v) => v?.toLowerCase().includes(q))));
  }, [state.items, segment, query]);

  const selectedItems = state.items.filter((item) => selected.includes(keyOf(item)));
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.includes(keyOf(item)));
  const oldest = state.items[0];

  const toggle = (key) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleAllVisible = () => {
    const keys = visible.map(keyOf);
    setSelected((prev) => (allVisibleSelected ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])]));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white shadow-lg sm:p-8">
        <Stamp aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 rotate-12 text-white/5" />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
          <Stamp className="h-3.5 w-3.5" aria-hidden="true" /> Pemaraf · {currentUser?.name}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Antrean Paraf</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/75">
          Centang dokumen yang sudah Anda telaah, lalu bubuhkan paraf sekaligus. Setelah seluruh Pemaraf memaraf,
          dokumen diteruskan ke Kepala LPMQ untuk disahkan.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs text-white/70">Menunggu paraf Anda</p>
            <p className="mt-1 text-3xl font-black">{state.items.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs text-white/70">Paling lama menunggu</p>
            <p className="mt-1 text-lg font-bold">{oldest ? `${waitingDays(oldest.requested_at)} hari` : '-'}</p>
            <p className="text-xs text-white/60">{oldest ? `sejak ${formatDate(oldest.requested_at)}` : 'Tidak ada antrean'}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs text-white/70">Urutan antrean</p>
            <p className="mt-1 text-sm font-bold">Terlama di atas</p>
            <p className="text-xs text-white/60">Dokumen yang lebih dulu diajukan diparaf lebih dulu.</p>
          </div>
        </div>
      </section>

      {/* Tabel antrean (pola sama dengan "Antrean Kerja Pentashihan" di dashboard) */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="space-y-4 border-b border-line p-5 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Antrean Paraf Saya</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{visible.length} dokumen dalam filter • {selected.length} dipilih</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <label htmlFor="paraf-search" className="sr-only">Cari dokumen</label>
                <input id="paraf-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nomor, judul, penerbit..."
                  className="w-full rounded-xl border border-line-strong bg-canvas/70 py-2 pl-9 pr-3.5 text-xs text-ink outline-none transition-all focus:border-brand-700 focus:bg-surface focus:ring-2 focus:ring-brand-700/20" />
              </div>
              <button type="button" onClick={load} aria-label="Muat ulang antrean"
                className="rounded-xl border border-line-strong p-2 text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
                <RefreshCw className={`h-4 w-4 ${state.loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Segmentasi jenis dokumen">
              <span className="mr-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Filter className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" /> Segmentasi:
              </span>
              <button type="button" aria-pressed={segment === 'ALL'} onClick={() => setSegment('ALL')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${segment === 'ALL' ? 'bg-brand-700 text-white' : 'border border-brand-100 bg-brand-50 text-brand-800'}`}>
                Semua Antrean ({state.items.length})
              </button>
              {Object.entries(PARAF_TYPES).map(([type, t]) => (
                <button key={type} type="button" aria-pressed={segment === type} onClick={() => setSegment(type)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${segment === type ? t.chipOn : t.chip}`}>
                  {t.label} ({counts[type] || 0})
                </button>
              ))}
            </div>
            <button type="button" onClick={toggleAllVisible} disabled={!visible.length}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-40 ${
                allVisibleSelected ? 'border-brand-700 bg-brand-700 text-white shadow-xs' : 'border-line-strong bg-surface text-ink hover:bg-canvas'}`}>
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {allVisibleSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          </div>
        </div>

        {state.error ? (
          <div role="alert" className="m-5 flex items-center gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-4 text-sm text-civic-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {state.error}
            <button type="button" onClick={load} className="ml-auto font-semibold underline">Muat ulang</button>
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={state.loading}>
            <table className="w-full min-w-[960px] border-collapse text-left">
              <caption className="sr-only">Dokumen yang menunggu paraf Anda</caption>
              <thead>
                <tr className="border-b border-line bg-canvas/80 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="px-6 py-3.5">Referensi &amp; Tanggal</th>
                  <th scope="col" className="px-6 py-3.5">Entitas &amp; Naskah</th>
                  <th scope="col" className="px-6 py-3.5">Profil Layanan</th>
                  <th scope="col" className="px-6 py-3.5">Penanggung Jawab</th>
                  <th scope="col" className="px-6 py-3.5">Status Sistem</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {state.loading && !state.items.length && (
                  <tr><td colSpan={6} className="py-16 text-center text-ink-muted">
                    <RefreshCw className="mx-auto mb-2 h-7 w-7 text-brand-700 motion-safe:animate-spin" aria-hidden="true" />
                    <p className="text-xs font-semibold">Memuat antrean paraf...</p>
                  </td></tr>
                )}
                {!state.loading && !visible.length && (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <span className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Inbox className="h-6 w-6" aria-hidden="true" /></span>
                    <p className="text-sm font-bold text-ink">{state.items.length ? 'Tidak ada dokumen pada filter ini' : 'Semua sudah diparaf'}</p>
                    <p className="mt-1 text-xs text-ink-muted">{state.items.length ? 'Ubah segmentasi atau kata kunci pencarian.' : 'Belum ada dokumen yang menunggu paraf Anda.'}</p>
                  </td></tr>
                )}
                {visible.map((item) => {
                  const key = keyOf(item);
                  const checked = selected.includes(key);
                  const type = PARAF_TYPES[item.type] || PARAF_TYPES.MASTER_LETTER;
                  const TypeIcon = type.icon;
                  const days = waitingDays(item.requested_at);
                  return (
                    <tr key={key} className={`transition-colors ${checked ? 'bg-brand-50/70' : 'hover:bg-brand-50/40'}`}>
                      <td className="px-6 py-4 align-top">
                        <span className="block font-mono text-xs font-bold text-ink">{item.reference}</span>
                        <span className="text-xs text-ink-muted">{formatDate(item.submitted_at || item.requested_at)}</span>
                      </td>
                      <td className="max-w-[240px] px-6 py-4 align-top">
                        <span className="line-clamp-2 block font-bold text-ink">{item.title || '-'}</span>
                        <span className="block text-xs font-semibold text-brand-800">{item.publisher || 'Penerbit Terdaftar'}</span>
                      </td>
                      <td className="px-6 py-4 align-top text-xs">
                        <span className="block font-semibold text-ink">{item.service?.name || '-'}</span>
                        <span className="text-ink-muted">{item.service?.category || item.detail}</span>
                      </td>
                      <td className="px-6 py-4 align-top text-xs">
                        <div className="space-y-1.5">
                          {(item.people || []).map((person) => (
                            <div key={person.role} className="flex items-center gap-1.5">
                              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${PEOPLE_BADGE[person.role] || 'border-line-strong bg-surface-subtle text-ink'}`}>
                                {person.role}
                              </span>
                              <span className="max-w-[130px] truncate font-semibold text-ink">
                                {person.name || <span className="font-normal italic text-ink-muted">Tidak tercatat</span>}
                              </span>
                            </div>
                          ))}
                          <p className="text-ink-muted">{item.detail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${type.pill}`}>
                          <TypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {type.status}
                        </span>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-surface-subtle px-2 py-1 font-semibold text-ink">Urutan #{item.queue_position}</span>
                          <ParafDots done={item.paraf_done} required={item.paraf_required} />
                        </div>
                        <p className={`mt-1.5 text-xs ${days >= 3 ? 'font-semibold text-civic-warning' : 'text-ink-muted'}`}>
                          Masuk: {formatDate(item.requested_at)}{days >= 3 ? ` · ${days} hari` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link to={item.link}
                            className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-center text-xs font-semibold leading-tight text-ink shadow-2xs hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
                            Tinjau<br />Detail
                          </Link>
                          <ParafSelectBox checked={checked} onChange={() => toggle(key)} label={`Pilih ${item.reference} ${item.title || ''} untuk diparaf`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ParafCheckout selectedItems={selectedItems} onClear={() => setSelected([])}
        onFinished={(failedKeys) => { setSelected(failedKeys); load(); }} />
    </div>
  );
};

export default ParafQueuePage;
