import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Eye, MapPin, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

const TABS = [
  { key: 'all', label: 'Data Penerbit Al-Qur’an' },
  { key: 'letter', label: 'Berdasarkan Alfabet' },
  { key: 'province', label: 'Berdasarkan Provinsi' },
  { key: 'search', label: 'Pencarian Spesifik' },
];
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
const PAGE_SIZES = [10, 20, 50, 100];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

// Isi Direktori Penerbit Mushaf Al-Qur'an, meniru struktur direktori lama (tashih.lpmqkemenag.id/info-penerbit):
// seluruh data, per huruf awal, per provinsi, dan pencarian spesifik. Dipakai halaman Super Admin dan halaman
// Informasi publik; fetchDirectory menentukan endpoint, showSensitive menampilkan NPWP/NIB (internal saja).
export const PublisherDirectory = ({ fetchDirectory, showSensitive = false }) => {
  const [tab, setTab] = useState('all');
  const [letter, setLetter] = useState('A');
  const [province, setProvince] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null, summary: null });
  const [detail, setDetail] = useState(null);

  // Tab menentukan filter yang dikirim; tab lain tidak membawa filternya agar hasil tidak tercampur.
  const filters = {
    letter: tab === 'letter' ? letter : undefined,
    province: tab === 'province' ? province || undefined : undefined,
    search: tab === 'search' ? search || undefined : undefined,
  };
  const waitingForInput = (tab === 'province' && !province) || (tab === 'search' && !search);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    fetchDirectory({ ...filters, page, limit })
      .then((response) => active && setState({
        loading: false,
        error: '',
        items: response?.data || [],
        pagination: response?.pagination || null,
        summary: response?.summary || null,
      }))
      .catch((error) => active && setState((current) => ({
        ...current,
        loading: false,
        error: error?.message || 'Direktori penerbit belum dapat dimuat.',
      })));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters diturunkan dari state di bawah
  }, [tab, letter, province, search, page, limit, reloadKey]);

  const changeTab = (key) => {
    setTab(key);
    setPage(1);
  };
  const summary = state.summary;
  const pagination = state.pagination;
  const tabLabel = (key, label) => (key === 'all' && summary ? `${label} · ${summary.total} Penerbit` : label);

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Tampilan direktori" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 lg:grid-cols-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`directory-tab-${key}`}
            aria-selected={tab === key}
            aria-controls="directory-panel"
            onClick={() => changeTab(key)}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${tab === key ? 'bg-brand-700 text-white' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink'}`}
          >
            {tabLabel(key, label)}
          </button>
        ))}
      </div>

      <section id="directory-panel" role="tabpanel" aria-labelledby={`directory-tab-${tab}`} className="space-y-4">
        {tab === 'letter' && (
          <div className="flex flex-wrap gap-1.5" aria-label="Pilih huruf awal nama penerbit">
            {LETTERS.map((item) => {
              const count = summary?.letters?.[item] || 0;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!count}
                  aria-pressed={letter === item}
                  aria-label={`Huruf ${item === '#' ? 'angka/simbol' : item}, ${count} penerbit`}
                  onClick={() => { setLetter(item); setPage(1); }}
                  className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${letter === item ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink hover:bg-surface-subtle'}`}
                >
                  {item}
                  {count > 0 && <span className={`ml-1 text-[10px] font-normal ${letter === item ? 'text-white/80' : 'text-ink-muted'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'province' && (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Pilih provinsi">
            {(summary?.provinces || []).map(({ name, count }) => (
              <button
                key={name}
                type="button"
                disabled={!count}
                aria-pressed={province === name}
                onClick={() => { setProvince(name); setPage(1); }}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${province === name ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink hover:bg-surface-subtle'}`}
              >
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{name}</span>
                <span className={`text-xs font-semibold ${province === name ? 'text-white/80' : 'text-ink-muted'}`}>{count}</span>
              </button>
            ))}
          </div>
        )}
        {tab === 'province' && (
          <p className="text-xs text-ink-muted">Provinsi dikenali otomatis dari teks alamat. Alamat tanpa nama provinsi/kota yang dikenali masuk “Belum Terdeteksi”.</p>
        )}

        {tab === 'search' && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}
          >
            <label htmlFor="directory-search" className="sr-only">Kata kunci penerbit</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="directory-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nama penerbit, alamat, penanggung jawab, email, telepon, atau nomor induk"
                className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <button type="submit" className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              Cari
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 text-sm text-ink">
          <label htmlFor="directory-limit" className="font-semibold">Tampilkan</label>
          <select
            id="directory-limit"
            value={limit}
            onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>Baris</span>
        </div>

        {state.error && (
          <div className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-4 text-sm text-civic-danger" role="alert">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />{state.error}
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="ml-3 font-semibold underline">Muat ulang</button>
          </div>
        )}

        {!state.error && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm" aria-busy={state.loading}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Daftar penerbit mushaf Al-Qur’an</caption>
              <thead className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="w-14 px-4 py-3">No</th>
                  <th scope="col" className="w-48 px-4 py-3">Nama Penerbit</th>
                  <th scope="col" className="px-4 py-3">Alamat</th>
                  <th scope="col" className="w-44 px-4 py-3">Penanggung Jawab</th>
                  <th scope="col" className="w-36 px-4 py-3">Telepon</th>
                  <th scope="col" className="w-52 px-4 py-3">Email</th>
                  <th scope="col" className="w-20 px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.loading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">Memuat direktori penerbit…</td></tr>
                )}
                {!state.loading && waitingForInput && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">
                    {tab === 'province' ? 'Pilih provinsi untuk menampilkan penerbit.' : 'Masukkan kata kunci lalu tekan Cari.'}
                  </td></tr>
                )}
                {!state.loading && !waitingForInput && state.items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">Tidak ada penerbit yang sesuai.</td></tr>
                )}
                {!state.loading && !waitingForInput && state.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-surface-subtle/60">
                    <td className="px-4 py-4 text-ink-muted">{item.no}</td>
                    <td className="px-4 py-4 font-semibold text-ink">{item.name}</td>
                    <td className="px-4 py-4 leading-6 text-ink">
                      {item.address || '-'}
                      <span className="mt-1 block text-xs text-ink-muted">{item.province}</span>
                    </td>
                    <td className="px-4 py-4 text-ink">{item.pic_name || '-'}</td>
                    <td className="px-4 py-4 text-ink">{item.phone || '-'}</td>
                    <td className="break-all px-4 py-4 text-ink">{item.email || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        aria-label={`Lihat detail ${item.name}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-surface-subtle"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!state.loading && !waitingForInput && pagination?.total > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-surface-subtle/50 p-4 sm:flex-row">
                <p className="text-xs text-ink-muted">
                  Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} penerbit
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Sebelumnya</button>
                  <span className="text-xs text-ink-muted">{pagination.page} / {pagination.totalPages}</span>
                  <button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40">Berikutnya <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name || 'Detail Penerbit'} description="Penerbit terverifikasi LPMQ" size="lg">
        {detail && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['Nomor Induk Penerbit', detail.nomor_induk_penerbit],
              ['Jenis Badan', detail.entity_type],
              ['Alamat', detail.address, true],
              ['Provinsi', detail.province],
              ['Disetujui', formatDate(detail.verified_at)],
              ['Penanggung Jawab', detail.pic_name],
              ['Telepon', detail.phone],
              ['Email', detail.email],
              ...(showSensitive ? [['NPWP', detail.npwp], ['NIB', detail.nib]] : []),
            ].map(([label, value, wide]) => (
              <div key={label} className={wide ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
                <dd className="mt-0.5 break-words text-ink">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
};

export default PublisherDirectory;
