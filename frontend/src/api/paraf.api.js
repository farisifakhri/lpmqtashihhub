import apiClient from './client';
import { verificationApi } from './verification.api';
import { tashihApi } from './tashih.api';
import { documentationApi } from './documentation.api';
import { masterRequestApi } from './master-request.api';

// Paraf tetap lewat endpoint asal tiap alur agar seluruh aturan (penunjukan, status, audit) berlaku.
// Endpoint persetujuan verifikasi melayani Pemaraf (dicatat paraf) dan Kepala (pengesahan, nomor surat otomatis).
const PARAF_ACTIONS = {
  VERIFICATION_RESULT: (id) => verificationApi.approveDocument(id, { auto_number: true, auto_generate: true }),
  DISTRIBUTOR_REVIEW: (id) => tashihApi.parafDistribution(id),
  STT: (id) => documentationApi.parafTu(id, {}),
  MASTER_LETTER: (id) => masterRequestApi.sign(id),
};

export const parafApi = {
  /** Dokumen yang menunggu paraf Pemaraf yang login, dari semua alur. */
  queue: () => apiClient('/paraf/queue'),
  /** Bubuhkan paraf pada satu item antrean ({ type, action_id }). */
  paraf: (item) => {
    const run = PARAF_ACTIONS[item?.type];
    if (!run) return Promise.reject(new Error(`Jenis dokumen ${item?.type} tidak dikenal.`));
    return run(item.action_id);
  },
};
