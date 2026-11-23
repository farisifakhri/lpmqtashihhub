import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ShieldCheck, Stamp } from 'lucide-react';
import { accessRoles, checkIsPemaraf } from '@/lib/roles';
import { approvalStageText } from '../inspection-view-model';
import { ParafCheckout, ParafSelectBox, parafKey } from '@/features/paraf/ParafCheckout';

const RESULT_DOC_TYPES = ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'];
const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '-');

/** Dokumen hasil verifikasi yang dipakai untuk paraf (surat hasil lebih dulu, lalu berita acara). */
const parafDocOf = (item) => {
  const docs = (item.documents || []).filter((d) => d.status === 'SUBMITTED' && RESULT_DOC_TYPES.includes(d.document_type));
  return docs.find((d) => d.document_type !== 'BERITA_ACARA_VERIFIKASI') || docs[0] || null;
};

/**
 * Alur surat hasil verifikasi: Verifikator mengajukan -> Paraf Pemaraf -> Pengesahan Kepala -> Dikirim ke Penerbit.
 * Draf di tab ini selalu sudah diajukan dan belum disahkan, jadi langkah aktif = paraf atau pengesahan.
 */
const LetterFlow = ({ paraf, signers, required }) => {
  const parafDone = !paraf || paraf.complete;
  const steps = [
    { label: 'Diajukan Verifikator', state: 'done' },
    ...(paraf ? [{ label: `Paraf Pemaraf (${signers}/${required})`, state: parafDone ? 'done' : 'current' }] : []),
    { label: 'Pengesahan Kepala LPMQ', state: parafDone ? 'current' : 'todo' },
    { label: 'Dikirim ke Penerbit', state: 'todo' },
  ];
  return (
    <ol className="mt-2.5 space-y-1" aria-label="Alur surat hasil verifikasi">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex items-center gap-2 text-[11px]">
          {i < steps.length - 1 && (
            <span aria-hidden="true" className={`absolute left-[5px] top-3 h-3 w-0.5 ${step.state === 'done' ? 'bg-civic-success' : 'bg-line'}`} />
          )}
          <span aria-hidden="true" className={`relative z-10 h-3 w-3 shrink-0 rounded-full ${
            step.state === 'done' ? 'bg-civic-success'
              : step.state === 'current' ? 'bg-surface ring-2 ring-civic-warning motion-safe:animate-pulse' : 'border-2 border-line-strong bg-surface'}`} />
          <span className={step.state === 'done' ? 'text-ink' : step.state === 'current' ? 'font-bold text-civic-warning' : 'text-ink-muted'}>
            {step.label}
          </span>
          <span className="sr-only">{step.state === 'done' ? '(selesai)' : step.state === 'current' ? '(sedang berjalan)' : '(belum)'}</span>
        </li>
      ))}
    </ol>
  );
};

/** Pemaraf yang ditunjuk (atau draf lama tanpa penunjukan) dan belum memaraf. */
export const canParafItem = (item, user) => {
  const paraf = item.paraf;
  if (!checkIsPemaraf(user) || !paraf || paraf.complete || !parafDocOf(item)) return false;
  if (Array.isArray(paraf.assigned) && !paraf.assigned.includes(user.id)) return false;
  return !(paraf.signers || []).some((s) => s.id === user.id);
};

/**
 * Kepala LPMQ dapat mengesahkan bila paraf seluruh Pemaraf lengkap (atau gerbang paraf tidak aktif) dan ia
 * bukan salah satu Pemaraf draf itu. Syarat lain (tanda tangan Verifikator, billing) tetap diperiksa server.
 */
export const canHeadApproveItem = (item, user) => {
  if (!parafDocOf(item)) return false;
  if (item.paraf && !item.paraf.complete) return false;
  return !(item.paraf?.signers || []).some((s) => s.id === user?.id);
};

const isHeadUser = (user) => !checkIsPemaraf(user)
  && (user?.role === 'KEPALA_LPMQ' || accessRoles(user?.roles || []).includes('KEPALA_LPMQ'));

/**
 * Tab "Menunggu Persetujuan" bergaya tabel antrean dashboard. Pemaraf (paraf) dan Kepala LPMQ (pengesahan)
 * memilih draf lewat kotak di samping "Tinjau Detail" lalu memproses sekaligus lewat card kanan bawah;
 * peran lain hanya meninjau.
 */
export const VerificationApprovalTable = ({ assignments, currentUser, onRefresh }) => {
  const [selected, setSelected] = useState([]);
  const isPemaraf = checkIsPemaraf(currentUser);
  const isHead = isHeadUser(currentUser);
  // Mode aksi massal sesuai peran aktif; null = hanya meninjau.
  const mode = isPemaraf ? 'paraf' : isHead ? 'approve' : null;
  const verb = mode === 'approve' ? 'disahkan' : 'diparaf';

  // Item aksi hanya untuk draf yang giliran pengguna ini; key = parafKey agar cocok dengan card checkout.
  const rows = useMemo(() => assignments.map((item) => {
    const reg = item.registration || {};
    const doc = parafDocOf(item);
    const eligible = mode === 'paraf' ? canParafItem(item, currentUser) : mode === 'approve' ? canHeadApproveItem(item, currentUser) : false;
    return {
      item, reg, eligible,
      paraf: eligible ? { type: 'VERIFICATION_RESULT', action_id: doc.id, reference: reg.registration_no, title: reg.title } : null,
    };
  }), [assignments, currentUser, mode]);
  const eligibleRows = rows.filter((r) => r.eligible);
  const signedRows = isPemaraf ? rows.filter((r) => (r.item.paraf?.signers || []).some((s) => s.id === currentUser?.id)) : [];
  const selectedItems = eligibleRows.filter((r) => selected.includes(parafKey(r.paraf))).map((r) => r.paraf);
  const allSelected = eligibleRows.length > 0 && selectedItems.length === eligibleRows.length;
  // Pilih semua: hanya draf yang memang giliran Anda; draf lain (bukan ditunjuk / sudah diparaf) dilewati.
  const toggleAll = () => setSelected(allSelected ? [] : eligibleRows.map((r) => parafKey(r.paraf)));

  const toggle = (key) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {mode && (
          <div className={`flex items-start gap-2.5 border-b px-5 py-3 text-xs sm:px-6 ${
            eligibleRows.length ? 'border-brand-100 bg-brand-50/60 text-brand-900'
              : signedRows.length ? 'border-civic-successLine bg-civic-successSoft text-civic-success' : 'border-line bg-surface-subtle text-ink-muted'}`} role="status">
            {mode === 'approve' ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Stamp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            {eligibleRows.length ? (
              <p>
                <strong>{eligibleRows.length}</strong> dari {rows.length} draf {mode === 'approve' ? 'siap Anda sahkan (paraf lengkap)' : 'menunggu paraf Anda'}
                {selectedItems.length > 0 && <> · <strong>{selectedItems.length}</strong> dipilih</>}.
                {' '}Centang kotak di kolom Aksi, atau kotak di judul kolom untuk memilih semuanya sekaligus.
                {mode === 'approve' && ' Nomor surat resmi dan kode billing diterbitkan otomatis.'}
              </p>
            ) : mode === 'approve' ? (
              <p>Belum ada draf yang siap disahkan. Draf dapat disahkan setelah kedua Pemaraf yang ditunjuk membubuhkan paraf.</p>
            ) : signedRows.length ? (
              <p>Anda sudah memaraf <strong>{signedRows.length}</strong> draf. Draf diteruskan ke Kepala LPMQ untuk disahkan setelah seluruh Pemaraf memaraf; pantau alurnya di kolom Status Sistem.</p>
            ) : (
              <p>Tidak ada draf yang menunggu paraf Anda. Hanya 2 Pemaraf yang ditunjuk Verifikator yang dapat memaraf; namanya tertera di kolom Penanggung Jawab.</p>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <caption className="sr-only">Draf hasil verifikasi yang menunggu persetujuan</caption>
            <thead>
              <tr className="border-b border-line bg-canvas/80 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th scope="col" className="px-6 py-3.5">Referensi &amp; Tanggal</th>
                <th scope="col" className="px-6 py-3.5">Entitas &amp; Naskah</th>
                <th scope="col" className="px-6 py-3.5">Profil Layanan</th>
                <th scope="col" className="px-6 py-3.5">Penanggung Jawab</th>
                <th scope="col" className="px-6 py-3.5">Status Sistem</th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  {mode && eligibleRows.length > 0 ? (
                    <span className="inline-flex items-center gap-2 normal-case tracking-normal">
                      <span className="text-[11px] font-semibold">{allSelected ? 'Semua dipilih' : `Pilih semua (${eligibleRows.length})`}</span>
                      <ParafSelectBox size="sm" checked={allSelected} partial={selectedItems.length > 0} onChange={toggleAll}
                        label={allSelected ? 'Batalkan pilihan semua draf' : `Pilih semua ${eligibleRows.length} draf ${mode === 'approve' ? 'yang siap Anda sahkan' : 'yang menunggu paraf Anda'}`} />
                    </span>
                  ) : 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {rows.map(({ item, reg, eligible, paraf }) => {
                const key = paraf ? parafKey(paraf) : item.id;
                const checked = eligible && selected.includes(key);
                const stage = approvalStageText(item.paraf, currentUser);
                const signers = item.paraf?.signers?.length || 0;
                const required = item.paraf?.required || 2;
                const parafComplete = Boolean(item.paraf?.complete);
                const mySignature = (item.paraf?.signers || []).find((s) => s.id === currentUser?.id);
                return (
                  <tr key={item.id} className={`transition-colors ${checked ? 'bg-brand-50/70' : 'hover:bg-brand-50/40'}`}>
                    <td className="px-6 py-4 align-top">
                      <span className="block font-mono text-xs font-bold text-ink">{reg.registration_no || '-'}</span>
                      <span className="text-xs text-ink-muted">{formatDate(reg.created_at || item.assigned_at)}</span>
                    </td>
                    <td className="max-w-[240px] px-6 py-4 align-top">
                      <span className="line-clamp-2 block font-bold text-ink">{reg.title || 'Naskah Mushaf'}</span>
                      <span className="block text-xs font-semibold text-brand-800">{reg.publisher?.legal_name || 'Penerbit Terdaftar'}</span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs">
                      <span className="block font-semibold text-ink">{reg.service_type?.name || 'Tashih Reguler'}</span>
                      <span className="text-ink-muted">{reg.service_type?.category?.name || 'Mushaf Cetak'}</span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-900">Verifikator</span>
                          <span className="max-w-[130px] truncate font-semibold text-ink">{item.verifier?.name || <span className="font-normal italic text-ink-muted">Belum ditugaskan</span>}</span>
                        </div>
                        {(item.paraf?.pemaraf || []).map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5">
                            <span className="shrink-0 rounded border border-civic-warningLine bg-civic-warningSoft px-1.5 py-0.5 text-[10px] font-bold text-civic-warning">Pemaraf</span>
                            <span className={`max-w-[130px] truncate font-semibold ${p.id === currentUser?.id ? 'text-brand-800' : 'text-ink'}`}>
                              {p.name}{p.id === currentUser?.id ? ' (Anda)' : ''}
                            </span>
                            {p.signed
                              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-civic-success" aria-label="sudah memaraf" />
                              : <Clock className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-label="belum memaraf" />}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        parafComplete ? 'border-civic-warningLine bg-civic-warningSoft text-civic-warning'
                          : eligible ? 'border-brand-200 bg-brand-50 text-brand-900' : 'border-civic-infoLine bg-civic-infoSoft text-civic-info'}`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {parafComplete ? 'Menunggu Pengesahan Kepala LPMQ' : stage.title}
                      </span>
                      <LetterFlow paraf={item.paraf} signers={signers} required={required} />
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {item.queue_position && <span className="rounded-md bg-surface-subtle px-2 py-1 font-semibold text-ink">Urutan #{item.queue_position}</span>}
                        <span className="text-ink-muted">Masuk: {formatDate(reg.stage_entered_at || item.assigned_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link to={`/internal/verifications/${item.id}`}
                          className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-center text-xs font-semibold leading-tight text-ink shadow-2xs hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
                          Tinjau<br />Detail
                        </Link>
                        {isPemaraf && (mySignature ? (
                          // Sudah diparaf: cap pengganti kotak pilih, mengikuti alur surat.
                          <span className="inline-flex -rotate-2 flex-col items-center rounded-lg border-2 border-civic-success px-2 py-1 text-[10px] font-black uppercase leading-tight tracking-wide text-civic-success"
                            title={`Anda memaraf pada ${formatDate(mySignature.signed_at)}`}>
                            <span className="inline-flex items-center gap-1"><Stamp className="h-3 w-3" aria-hidden="true" /> Diparaf</span>
                            <span className="font-mono text-[9px] font-semibold normal-case">{formatDate(mySignature.signed_at)}</span>
                          </span>
                        ) : eligible ? (
                          <ParafSelectBox checked={checked} onChange={() => toggle(key)}
                            label={`Pilih ${reg.registration_no} ${reg.title || ''} untuk ${verb}`} />
                        ) : (
                          <ParafSelectBox checked={false} disabled disabledReason={stage.body} onChange={() => {}}
                            label={`${reg.registration_no}: ${stage.body}`} />
                        ))}
                        {isHead && (eligible ? (
                          <ParafSelectBox checked={checked} onChange={() => toggle(key)}
                            label={`Pilih ${reg.registration_no} ${reg.title || ''} untuk ${verb}`} />
                        ) : (
                          <ParafSelectBox checked={false} disabled onChange={() => {}}
                            disabledReason={`Menunggu paraf Pemaraf (${signers}/${required}) sebelum dapat disahkan.`}
                            label={`${reg.registration_no}: menunggu paraf Pemaraf (${signers}/${required}) sebelum dapat disahkan`} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {mode && (
        <ParafCheckout mode={mode} selectedItems={selectedItems} onClear={() => setSelected([])}
          onFinished={(failedKeys) => { setSelected(failedKeys); onRefresh?.(); }} />
      )}
    </div>
  );
};

export default VerificationApprovalTable;
