import * as complaintService from '../services/complaint.service.js';
import { createCaptcha } from '../services/captcha.service.js';

const handle = (fn) => async (req, res, next) => {
  try { return await fn(req, res); } catch (error) { return next(error); }
};

const noStore = (res) => res.set('Cache-Control', 'no-store');

// ---- Publik ----
export const getReference = handle((req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  return res.json({ success: true, data: complaintService.getComplaintReference() });
});

export const getCaptcha = handle((req, res) => {
  noStore(res);
  return res.json({ success: true, data: createCaptcha() });
});

export const createPrintError = handle(async (req, res) => {
  const data = await complaintService.createPrintErrorComplaint(req.body, req.files);
  return res.status(201).json({ success: true, message: 'Pengaduan berhasil dikirim dan diterima oleh sistem.', data });
});

export const createService = handle(async (req, res) => {
  const data = await complaintService.createServiceComplaint(req.body);
  return res.status(201).json({ success: true, message: 'Pengaduan berhasil dikirim dan diterima oleh sistem.', data });
});

export const track = handle(async (req, res) => {
  noStore(res);
  return res.json({ success: true, data: await complaintService.trackComplaint(req.body.kode) });
});

// ---- Admin ----
export const listAdmin = handle(async (req, res) => {
  const result = await complaintService.listAdminComplaints(req.query);
  return res.json({ success: true, data: result.data, counts: result.counts, pagination: result.pagination });
});

export const getAdminDetail = handle(async (req, res) =>
  res.json({ success: true, data: await complaintService.getAdminComplaintDetail(req.params.id) }));

export const getAttachment = handle(async (req, res) => {
  const file = await complaintService.getComplaintAttachment(req.params.id, req.params.attachmentId, req.user, req);
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(file.content);
});

export const accept = handle(async (req, res) => res.json({
  success: true,
  message: 'Pengaduan diterima.',
  data: await complaintService.acceptComplaint(req.params.id, req.body, req.user, req),
}));

export const reject = handle(async (req, res) => res.json({
  success: true,
  message: 'Pengaduan ditolak.',
  data: await complaintService.rejectComplaint(req.params.id, req.body, req.user, req),
}));

export const updateStatus = handle(async (req, res) => res.json({
  success: true,
  message: 'Status pengaduan diperbarui.',
  data: await complaintService.updateComplaintStatus(req.params.id, req.body, req.user, req),
}));

export const finalReport = handle(async (req, res) => res.json({
  success: true,
  message: 'Laporan akhir disimpan dan pengaduan dinyatakan selesai.',
  data: await complaintService.submitFinalReport(req.params.id, req.body, req.user, req),
}));
