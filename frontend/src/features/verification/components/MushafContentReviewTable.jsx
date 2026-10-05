import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  Edit3,
  Trash2,
  Plus,
  BookOpen,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const INITIAL_CONTENT_CATEGORIES = [
  { id: 'STANDAR_RASM', name: 'Standar Rasm & Tanda Baca' },
  { id: 'FORMAT_NASKAH', name: 'Cakupan & Kelompok Naskah' },
  { id: 'MATERI_TAMBAHAN', name: 'Materi Tambahan / Suplemen' },
  { id: 'UKURAN_OPLAH', name: 'Ukuran Naskah & Oplah Cetak' },
  { id: 'PERCETAKAN_PJ', name: 'Percetakan & Penanggung Jawab' },
];

export function MushafContentReviewTable({
  registration,
  contentReview,
  onChange,
  isReadOnly,
}) {
  const meta = registration?.foreign_metadata || {};

  // Build initial items from registration claim if not yet modified
  const generateDefaultItems = () => {
    const rawSizes = meta.sizes || [];
    const sizesStr = rawSizes.length > 0
      ? rawSizes.map((s) => `${s.ukuran || '-'} (${s.oplah?.toLocaleString?.('id-ID') || 0} eks)`).join(', ')
      : 'Standar';

    const jenisNaskahStr = Array.isArray(meta.jenis_naskah) && meta.jenis_naskah.length > 0
      ? meta.jenis_naskah.join(', ')
      : (registration?.service_type?.name || 'Mushaf Standar');

    const materiTambahanStr = Array.isArray(meta.materi_tambahan) && meta.materi_tambahan.length > 0
      ? meta.materi_tambahan.join(', ')
      : 'Tidak ada materi tambahan';

    return [
      {
        id: 'item-rasm',
        category: 'Standar Rasm & Tanda Baca',
        claimed_value: meta.jenis_mushaf || 'Mushaf Standar Indonesia (Usmani)',
        status: 'SESUAI',
        verified_value: meta.jenis_mushaf || 'Mushaf Standar Indonesia (Usmani)',
        notes: '',
        isCustom: false,
      },
      {
        id: 'item-format',
        category: 'Cakupan & Kelompok Naskah',
        claimed_value: jenisNaskahStr,
        status: 'SESUAI',
        verified_value: jenisNaskahStr,
        notes: '',
        isCustom: false,
      },
      {
        id: 'item-materi',
        category: 'Materi Tambahan / Suplemen',
        claimed_value: materiTambahanStr,
        status: 'SESUAI',
        verified_value: materiTambahanStr,
        notes: '',
        isCustom: false,
      },
      {
        id: 'item-ukuran',
        category: 'Ukuran Naskah & Oplah Cetak',
        claimed_value: sizesStr,
        status: 'SESUAI',
        verified_value: sizesStr,
        notes: '',
        isCustom: false,
      },
      {
        id: 'item-pj',
        category: 'Percetakan & Penanggung Jawab',
        claimed_value: `PJ: ${meta.penanggung_jawab_produk || '-'} | Percetakan: ${meta.nama_percetakan || '-'}`,
        status: 'SESUAI',
        verified_value: `PJ: ${meta.penanggung_jawab_produk || '-'} | Percetakan: ${meta.nama_percetakan || '-'}`,
        notes: '',
        isCustom: false,
      },
    ];
  };

  const [items, setItems] = useState(() => {
    if (contentReview?.items && Array.isArray(contentReview.items) && contentReview.items.length > 0) {
      return contentReview.items;
    }
    return generateDefaultItems();
  });

  const [newCategory, setNewCategory] = useState(INITIAL_CONTENT_CATEGORIES[2].name);
  const [newContentValue, setNewContentValue] = useState('');
  const [newContentNotes, setNewContentNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (contentReview?.items && Array.isArray(contentReview.items) && contentReview.items.length > 0) {
      setItems(contentReview.items);
    }
  }, [contentReview]);

  const updateItem = (id, updates) => {
    if (isReadOnly) return;
    const next = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setItems(next);
    if (onChange) {
      onChange({ items: next });
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newContentValue.trim() || isReadOnly) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      category: newCategory,
      claimed_value: '(Tidak didaftarkan oleh penerbit)',
      status: 'TAMBAH',
      verified_value: newContentValue.trim(),
      notes: newContentNotes.trim() || 'Ditemukan suplemen fisik tambahan pada saat pemeriksaan naskah.',
      isCustom: true,
    };

    const next = [...items, newItem];
    setItems(next);
    setNewContentValue('');
    setNewContentNotes('');
    setShowAddForm(false);
    if (onChange) {
      onChange({ items: next });
    }
  };

  const handleDeleteItem = (id) => {
    if (isReadOnly) return;
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (onChange) {
      onChange({ items: next });
    }
  };

  const sesuaiCount = items.filter((i) => i.status === 'SESUAI').length;
  const tambahCount = items.filter((i) => i.status === 'TAMBAH').length;
  const kurangCount = items.filter((i) => i.status === 'KURANG').length;
  const koreksiCount = items.filter((i) => i.status === 'KOREKSI').length;

  return (
    <div className="space-y-4">
      {/* Header and Summary Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-line shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-800" />
            Verifikasi & Koreksi Konten Mushaf (REV-16)
          </h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Tinjau kesesuaian, lakukan penambahan suplemen fisik yang ditemukan, atau kurangi konten yang tidak sesuai.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-900 border border-brand-200">
            ✓ {sesuaiCount} Sesuai
          </span>
          {tambahCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-civic-infoSoft text-civic-info border border-civic-infoLine">
              + {tambahCount} Tambah
            </span>
          )}
          {kurangCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
              - {kurangCount} Coret / Kurang
            </span>
          )}
          {koreksiCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
              ✎ {koreksiCount} Koreksi
            </span>
          )}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-line text-[11px] text-ink-muted font-bold">
                <th className="py-2.5 px-3.5 w-1/4">Elemen Konten</th>
                <th className="py-2.5 px-3.5 w-1/4">Klaim Penerbit</th>
                <th className="py-2.5 px-3.5 w-1/4">Status Penelaahan</th>
                <th className="py-2.5 px-3.5 w-1/4">Hasil Verifikasi & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const isSesuai = item.status === 'SESUAI';
                const isTambah = item.status === 'TAMBAH';
                const isKurang = item.status === 'KURANG';
                const isKoreksi = item.status === 'KOREKSI';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isKurang
                        ? 'bg-civic-dangerSoft/10'
                        : isTambah
                        ? 'bg-civic-infoSoft/10'
                        : isKoreksi
                        ? 'bg-civic-warningSoft/10'
                        : 'hover:bg-canvas'
                    }`}
                  >
                    {/* 1. Category */}
                    <td className="py-3 px-3.5 align-top font-bold text-ink">
                      <div className="space-y-1">
                        <span>{item.category}</span>
                        {item.isCustom && (
                          <span className="block text-[10px] text-brand-800 font-semibold bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded w-fit">
                            Konten Tambahan Verifikator
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Publisher Claim */}
                    <td className="py-3 px-3.5 align-top text-ink-muted">
                      <div className="p-2 rounded bg-canvas border border-line text-[11px] leading-relaxed break-words font-medium">
                        {item.claimed_value}
                      </div>
                    </td>

                    {/* 3. Action Buttons (Sesuai, Tambah, Kurang, Koreksi) */}
                    <td className="py-3 px-3.5 align-top">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() =>
                              updateItem(item.id, {
                                status: 'SESUAI',
                                verified_value: item.claimed_value,
                              })
                            }
                            className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                              isSesuai
                                ? 'bg-brand-800 text-white shadow-2xs font-bold'
                                : 'bg-surface-subtle border border-line text-ink hover:bg-canvas'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Sesuai
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => updateItem(item.id, { status: 'KURANG' })}
                            className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                              isKurang
                                ? 'bg-civic-danger text-white shadow-2xs font-bold'
                                : 'bg-surface-subtle border border-line text-ink hover:bg-canvas'
                            }`}
                          >
                            <MinusCircle className="w-3 h-3" /> Kurang
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => updateItem(item.id, { status: 'KOREKSI' })}
                            className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                              isKoreksi
                                ? 'bg-civic-warning text-white shadow-2xs font-bold'
                                : 'bg-surface-subtle border border-line text-ink hover:bg-canvas'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" /> Koreksi
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => updateItem(item.id, { status: 'TAMBAH' })}
                            className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                              isTambah
                                ? 'bg-civic-info text-white shadow-2xs font-bold'
                                : 'bg-surface-subtle border border-line text-ink hover:bg-canvas'
                            }`}
                          >
                            <PlusCircle className="w-3 h-3" /> Tambah
                          </button>
                        </div>

                        {item.isCustom && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-civic-danger hover:underline cursor-pointer pt-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus baris tambahan
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 4. Verified Value & Notes */}
                    <td className="py-3 px-3.5 align-top">
                      <div className="space-y-1.5">
                        {isKurang ? (
                          <div className="p-2 rounded bg-civic-dangerSoft text-civic-danger text-[11px] font-semibold flex items-center gap-1.5">
                            <MinusCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Konten dicoret / tidak lolos verifikasi fisik.</span>
                          </div>
                        ) : isKoreksi || isTambah ? (
                          <div>
                            <label className="block text-[10px] font-bold text-ink mb-0.5">
                              {isTambah ? 'Uraian Konten Tambahan:' : 'Hasil Koreksi Nilai:'}
                            </label>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={item.verified_value || ''}
                              onChange={(e) => updateItem(item.id, { verified_value: e.target.value })}
                              placeholder="Masukkan hasil penelaahan fisik..."
                              className="w-full text-xs p-1.5 rounded-lg border border-line bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 font-medium"
                            />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded bg-brand-50/50 text-brand-900 border border-brand-100 text-[11px] font-medium truncate">
                            ✓ {item.verified_value || item.claimed_value}
                          </div>
                        )}

                        <div>
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={item.notes || ''}
                            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                            placeholder="Catatan verifikator (opsional)..."
                            className="w-full text-[11px] p-1 rounded border border-line bg-white text-ink-muted focus:text-ink focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add New Custom Content Row Button */}
        {!isReadOnly && (
          <div className="p-3 bg-surface-subtle border-t border-line flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-ink-muted">
              Menemukan materi tambahan atau suplemen yang belum tercantum pada permohonan penerbit?
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-bold text-brand-800 border-brand-300 hover:bg-brand-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-brand-700" />
              {showAddForm ? 'Tutup Form Tambah' : 'Tambah Konten Baru'}
            </Button>
          </div>
        )}
      </div>

      {/* Add New Content Dialog / Form */}
      {showAddForm && !isReadOnly && (
        <form
          onSubmit={handleAddItem}
          className="p-4 bg-brand-50/60 rounded-xl border border-brand-200 space-y-3 animate-fadeIn text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2 border-b border-brand-200/80 pb-2">
            <PlusCircle className="w-4 h-4 text-brand-800" />
            <h4 className="font-bold text-ink">Form Penambahan Konten Mushaf Terverifikasi</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink mb-1">
                Kategori Materi
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full p-2 rounded-lg border border-line bg-white text-xs"
              >
                {INITIAL_CONTENT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="Suplemen Ekstra Lainnya">Suplemen Ekstra Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink mb-1">
                Uraian / Judul Materi yang Ditemukan <span className="text-civic-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={newContentValue}
                onChange={(e) => setNewContentValue(e.target.value)}
                placeholder="Contoh: Suplemen Do'a Khatmil Qur'an & Tajwid Warna"
                className="w-full p-2 rounded-lg border border-line bg-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">
              Catatan Dasar Penambahan (Alasan)
            </label>
            <input
              type="text"
              value={newContentNotes}
              onChange={(e) => setNewContentNotes(e.target.value)}
              placeholder="Contoh: Ditemukan lampiran do'a di halaman akhir master fisik naskah."
              className="w-full p-2 rounded-lg border border-line bg-white text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Simpan ke Lembar Konten
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
