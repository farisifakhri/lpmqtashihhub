import React, { useEffect, useState } from 'react';
import { tashihApi } from '@/api/tashih.api';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';

export const PEMARAF_REQUIRED = 2;

// Pilih tepat 2 Pemaraf aktif yang memaraf sebelum Kepala LPMQ mengesahkan.
// onAvailability(false) dipanggil bila belum ada akun Pemaraf aktif (gerbang paraf mati; tidak wajib memilih).
export const PemarafPicker = ({ value = [], onChange, onAvailability, disabled = false }) => {
  const [pemarafs, setPemarafs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    tashihApi.listPemaraf()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setPemarafs(list);
        onAvailability?.(list.length > 0);
      })
      .catch((err) => active && setError(err.message || 'Gagal memuat daftar Pemaraf.'));
    return () => { active = false; };
  }, []);

  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (value.length < PEMARAF_REQUIRED) onChange([...value, id]);
  };

  if (error) return <p role="alert" className="text-xs text-civic-danger">{error}</p>;
  if (!pemarafs) return <p className="text-xs text-ink-muted">Memuat daftar Pemaraf...</p>;
  if (pemarafs.length === 0) return null;

  return (
    <fieldset className="space-y-2 text-xs" disabled={disabled}>
      <legend className="font-bold text-ink mb-1">
        Tunjuk Pemaraf <span className="font-normal text-ink-muted">(wajib {PEMARAF_REQUIRED}, dipilih {value.length})</span>
      </legend>
      {pemarafs.length < PEMARAF_REQUIRED && (
        <p role="alert" className="text-civic-danger">
          Baru ada {pemarafs.length} akun Pemaraf aktif. Aktifkan minimal {PEMARAF_REQUIRED} akun Pemaraf sebelum mengajukan.
        </p>
      )}
      <div className="grid gap-1.5">
        {pemarafs.map((pemaraf) => {
          const checked = value.includes(pemaraf.id);
          return (
            <label
              key={pemaraf.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${checked ? 'border-brand-700 bg-brand-50' : 'border-line bg-white'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && value.length >= PEMARAF_REQUIRED}
                onChange={() => toggle(pemaraf.id)}
              />
              <span className="font-semibold text-ink">{pemaraf.name}</span>
              {pemaraf.nip && <span className="font-mono text-ink-muted">NIP {pemaraf.nip}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

// true bila pilihan sudah sah: gerbang paraf mati (tidak ada Pemaraf aktif) atau tepat 2 terpilih.
export const pemarafSelectionValid = (available, ids) => available === false || ids.length === PEMARAF_REQUIRED;

export default PemarafPicker;

// Dialog konfirmasi pengajuan yang wajib menunjuk 2 Pemaraf; onConfirm menerima array id (kosong bila gerbang mati).
export const PemarafSubmitDialog = ({ isOpen, onClose, onConfirm, title, description, objectName, confirmLabel = 'Ajukan ke Pemaraf', loading = false }) => {
  const [ids, setIds] = useState([]);
  const [available, setAvailable] = useState(null);
  useEffect(() => { if (!isOpen) { setIds([]); setAvailable(null); } }, [isOpen]);
  return (
    <ConfirmationSummaryDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(available ? ids : [])}
      title={title}
      description={description}
      objectName={objectName}
      nextActor="2 Pemaraf yang ditunjuk, lalu Kepala LPMQ"
      confirmLabel={confirmLabel}
      loading={loading}
      confirmDisabled={!pemarafSelectionValid(available, ids)}
    >
      {isOpen && <PemarafPicker value={ids} onChange={setIds} onAvailability={setAvailable} disabled={loading} />}
    </ConfirmationSummaryDialog>
  );
};
