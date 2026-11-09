import { z } from 'zod';

const params = z.object({ id: z.string().uuid() });
export const emptyAction = { params, body: z.object({}).strict() };
export const confirmPaymentSchema = { params, body: z.object({
  receipt_file_id: z.string().uuid(), external_ref: z.string().trim().min(1).max(191).optional(),
}).strict() };
export const assignmentSchema = { params, body: z.object({
  team_id: z.string().min(1).max(191).nullable().optional(),
  assignee_ids: z.array(z.string().uuid()).min(1).max(50).optional(),
  juz_assignments: z.array(z.object({
    team_id: z.string().min(1).max(191).nullable().optional(),
    assignee_id: z.string().uuid(),
    juz_numbers: z.array(z.number().int().min(1).max(30)).min(1).max(30),
  }).strict()).min(1).max(50).optional(),
  stage: z.enum(['INITIAL', 'REVISION', 'DUMMY']),
  allow_overlap: z.boolean().optional(),
  enforce_full_coverage: z.boolean().optional(),
  reassignment_reason: z.enum(['BEBAN_KERJA', 'ROTASI_TUGAS', 'PENDELEGASIAN', 'PERMINTAAN_DISTRIBUTOR', 'LAINNYA']).optional(),
  reassignment_notes: z.string().trim().max(500).optional(),
  is_individual: z.boolean().optional(),
  comparison_notes: z.string().trim().min(20, 'Catatan telaah pembanding minimal 20 karakter.').max(5000).optional(),
}).strict().superRefine((data, ctx) => {
  if (!data.assignee_ids && !data.juz_assignments) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Daftar pentashih atau penugasan juz wajib diisi.' });
    return;
  }
  if (data.assignee_ids && data.juz_assignments) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pilih penugasan per juz atau format daftar pentashih.' });
    return;
  }
  const assignees = data.assignee_ids || data.juz_assignments.map(item => item.assignee_id);
  if (new Set(assignees).size !== assignees.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Anggota tidak boleh duplikat.' });
  for (const item of (data.juz_assignments || [])) {
    if (new Set(item.juz_numbers).size !== item.juz_numbers.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nomor juz tidak boleh duplikat pada satu pentashih.' });
    }
  }
  if (!data.allow_overlap) {
    const juz = data.juz_assignments?.flatMap(item => item.juz_numbers) || [];
    if (new Set(juz).size !== juz.length) {
      const teamByAssignee = new Map();
      const juzSetByAssignee = new Map();
      for (const item of (data.juz_assignments || [])) {
        const itemTeam = item.team_id !== undefined ? item.team_id : (data.is_individual ? null : (data.team_id || null));
        teamByAssignee.set(item.assignee_id, itemTeam);
        juzSetByAssignee.set(item.assignee_id, new Set(item.juz_numbers));
      }
      const juzToAssignees = new Map();
      for (const item of (data.juz_assignments || [])) {
        for (const j of item.juz_numbers) {
          if (!juzToAssignees.has(j)) juzToAssignees.set(j, []);
          juzToAssignees.get(j).push(item.assignee_id);
        }
      }
      let invalidOverlap = false;
      for (const [, assigneeList] of juzToAssignees.entries()) {
        if (assigneeList.length > 1) {
          const firstTeam = teamByAssignee.get(assigneeList[0]);
          if (!firstTeam) {
            invalidOverlap = true;
            break;
          }
          const firstSet = juzSetByAssignee.get(assigneeList[0]);
          for (const aId of assigneeList) {
            if (teamByAssignee.get(aId) !== firstTeam) {
              invalidOverlap = true;
              break;
            }
            const aSet = juzSetByAssignee.get(aId);
            if (aSet.size !== firstSet.size || ![...aSet].every(j => firstSet.has(j))) {
              invalidOverlap = true;
              break;
            }
          }
          if (invalidOverlap) break;
        }
      }
      if (invalidOverlap) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Setiap juz hanya boleh ditugaskan kepada satu pentashih pada iterasi ini.' });
      }
    }
  }
}) };

export const documentationArchiveSchema = {
  params,
  body: z.object({
    has_master_documentation: z.boolean(),
    has_received_5_exemplars: z.boolean(),
    storage_location: z.object({
      cabinet: z.string().trim().max(191).optional(),
      rack: z.string().trim().max(191).optional(),
      archive_box: z.string().trim().max(191).optional(),
      notes: z.string().trim().max(1000).optional(),
    }).optional(),
    survey: z.object({
      mushaf_print_quality: z.enum(['SANGAT_BAIK', 'BAIK', 'CUKUP', 'KURANG']).optional(),
      rasm_compliance: z.enum(['SESUAI_STANDAR', 'PERLU_PERBAIKAN']).optional(),
      exemplar_timeliness: z.enum(['TEPAT_WAKTU', 'TERLAMBAT']).optional(),
      notes: z.string().trim().max(2000).optional(),
    }).optional(),
  }).strict().superRefine((data, ctx) => {
    if (data.has_master_documentation && data.has_received_5_exemplars) {
      if (!data.storage_location?.cabinet && !data.storage_location?.rack && !data.storage_location?.archive_box) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['storage_location'],
          message: 'Tempat pengarsipan fisik (lemari/rak/no. berkas) wajib diisi bila kedua persyaratan terpenuhi.',
        });
      }
    }
  }),
};
export const juzChecklistSchema = {
  params: z.object({ id: z.string().uuid(), juzNumber: z.coerce.number().int().min(1).max(30) }),
  body: z.object({
    result: z.enum(['PASSED', 'REVISION_REQUIRED']),
    notes: z.string().trim().max(2000).default(''),
  }).strict().refine(data => data.result === 'PASSED' || data.notes.length > 0, 'Catatan koreksi wajib diisi bila juz perlu perbaikan.'),
};
export const reviewSchema = { params, body: z.object({
  result: z.enum(['PASSED', 'REVISION_REQUIRED', 'REJECTED']),
  notes: z.string().trim().min(1, 'Catatan hasil telaah wajib diisi.').max(10000),
  recap_file_id: z.string().uuid('ID berkas rekap wajib berupa UUID valid.'),
  recap_scope: z.enum(['TEAM', 'SELF']).default('SELF'),
}).strict() };

export const revokePentashihAssignmentSchema = {
  params: z.object({ id: z.string().uuid('ID penugasan tidak valid.') }),
  body: z.object({
    reason: z.string().trim().min(5, 'Alasan pelepasan/pencabutan penugasan wajib diisi (minimal 5 karakter).').max(2000),
  }).strict(),
};

export const distributorReviewSchema = { params, body: z.object({
  result: z.enum(['PASSED', 'REVISION_REQUIRED', 'REJECTED']),
  notes: z.string().trim().min(1, 'Catatan keputusan distributor wajib diisi.').max(10000),
  revision_kind: z.enum(['NASKAH_PERBAIKAN', 'NASKAH_DUMI']).optional(),
  outgoing_courier: z.string().trim().max(100).optional(),
  outgoing_tracking_no: z.string().trim().max(100).optional(),
  outgoing_dispatch_date: z.string().datetime().optional().or(z.string().trim().optional()),
  outgoing_notes: z.string().trim().max(1000).optional(),
}).strict() };

export const outgoingDispatchSchema = { params, body: z.object({
  outgoing_courier: z.string().trim().min(1, 'Kurir atau metode pengiriman keluar wajib diisi.').max(100),
  outgoing_tracking_no: z.string().trim().min(1, 'Nomor resi pengiriman keluar wajib diisi.').max(100),
  outgoing_dispatch_date: z.string().datetime().optional().or(z.string().trim().optional()),
  outgoing_notes: z.string().trim().max(1000).optional(),
}).strict() };
export const documentSchema = { params, body: z.object({
  document_type: z.enum(['BERITA_ACARA_TASHIH', 'SURAT_TANDA_TASHIH', 'REVISION_RETURN_LETTER']),
}).strict() };
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Tanggal tidak valid.');
export const calendarSchema = { body: z.object({ days: z.array(z.object({
  date: calendarDate, is_working_day: z.boolean(), source: z.string().trim().min(1).max(191), description: z.string().max(191).optional(),
}).strict()).min(1).max(366) }).strict() };
export const returnPaymentSchema = {
  params,
  body: z.object({
    reason: z.string().trim().min(5, 'Alasan pengembalian / penolakan bukti pembayaran minimal 5 karakter.').max(1000),
  }).strict(),
};
export const paymentQuerySchema = {
  query: z.object({
    status: z.enum(['UNPAID', 'PAID', 'VERIFIED', 'EXPIRED', 'CANCELLED']).optional(),
    search: z.string().trim().max(191).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const myTasksQuerySchema = {
  query: z.object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'ASSIGNED', 'IN_PROGRESS', 'OVERDUE']).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
};



export const printingReportSchema = {
  params,
  body: z.object({
    batch_no: z.coerce.number().int().min(1, 'Nomor batch cetak minimal 1').optional(),
    print_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal cetak harus YYYY-MM-DD'),
    oplah_printed: z.coerce.number().int().min(1, 'Jumlah oplah dicetak minimal 1 eksemplar'),
    printer_name: z.string().trim().min(2, 'Nama percetakan minimal 2 karakter').max(255),
    printer_location: z.string().trim().min(2, 'Lokasi percetakan minimal 2 karakter').max(255),
    exemplar_sent: z.boolean().optional().default(false),
    exemplar_tracking_no: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }).strict(),
};
