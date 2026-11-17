// Progres paraf draf STT, sama dengan backend (official-document.service.js): seluruh Pemaraf aktif saat
// diserahkan (paraf_required, saat ini 2) wajib memaraf dengan urutan bebas sebelum masuk ke Kepala LPMQ.
// Dokumen lama mencatat paraf di paraf_1/paraf_2 dan selalu mewajibkan 2 paraf.
export const sttParafProgress = (tuWorkflow) => {
  const parafs = tuWorkflow?.parafs
    || [tuWorkflow?.paraf, tuWorkflow?.paraf_1, tuWorkflow?.paraf_2].filter(Boolean);
  const required = tuWorkflow?.paraf_required ?? 2;
  return {
    parafs,
    required,
    done: parafs.length,
    complete: Boolean(tuWorkflow?.submitted_at || tuWorkflow?.paraf_1) && parafs.length >= required,
    signedBy: (userId) => parafs.some((paraf) => paraf?.signed_by?.id === userId),
  };
};
