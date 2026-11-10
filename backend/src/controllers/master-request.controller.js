import * as masterRequestService from '../services/master-request.service.js';
import * as regionService from '../services/region.service.js';

const cachePublic = (res) => res.set('Cache-Control', 'public, max-age=86400');

const sendPdf = (res, file, disposition = 'inline') => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(file.content);
};

const handle = (fn) => async (req, res, next) => {
  try { return await fn(req, res); } catch (error) { return next(error); }
};

// ---- Referensi (publik) ----
export const listProvinces = handle((req, res) => {
  cachePublic(res);
  return res.json({ success: true, data: regionService.listProvinces() });
});
export const listRegencies = handle((req, res) => {
  const data = regionService.listRegencies(req.params.kode);
  cachePublic(res);
  return res.json({ success: true, data });
});
export const listDistricts = handle((req, res) => {
  const data = regionService.listDistricts(req.params.kode);
  cachePublic(res);
  return res.json({ success: true, data });
});
export const listMushafTypes = handle((req, res) => res.json({ success: true, data: masterRequestService.listMushafTypes() }));

// ---- Penerbit ----
export const createRequest = handle(async (req, res) => {
  const data = await masterRequestService.createMasterRequest(req.body, req.files, req.user);
  return res.status(201).json({
    success: true,
    message: 'Permohonan master mushaf berhasil dikirim. Pantau prosesnya pada menu Permohonan Master.',
    data,
  });
});
export const listMine = handle(async (req, res) =>
  res.json({ success: true, data: await masterRequestService.listPublisherMasterRequests(req.user) }));
export const getMine = handle(async (req, res) =>
  res.json({ success: true, data: await masterRequestService.getPublisherMasterRequest(req.params.id, req.user) }));
export const getMyLetter = handle(async (req, res) =>
  sendPdf(res, await masterRequestService.getPublisherLetterPdf(req.params.id, req.user), req.query.download ? 'attachment' : 'inline'));

// ---- Admin ----
export const listAdmin = handle(async (req, res) => {
  const result = await masterRequestService.listAdminMasterRequests(req.query);
  return res.json({ success: true, data: result.data, counts: result.counts, pagination: result.pagination });
});
export const getAdminDetail = handle(async (req, res) =>
  res.json({ success: true, data: await masterRequestService.getAdminMasterRequestDetail(req.params.id) }));
export const getDocument = handle(async (req, res) => {
  const file = await masterRequestService.getAdminMasterRequestDocument(req.params.id, req.params.documentId, req.user, req);
  return sendPdf(res, file);
});
export const reject = handle(async (req, res) => res.json({
  success: true,
  message: 'Permohonan ditolak dan penerbit telah diberi tahu.',
  data: await masterRequestService.rejectMasterRequest(req.params.id, req.body, req.user, req),
}));
export const submitLetter = handle(async (req, res) => res.json({
  success: true,
  message: 'Surat persetujuan diajukan ke Kepala LPMQ untuk ditandatangani.',
  data: await masterRequestService.submitLetterForSignature(req.params.id, req.body, req.user, req),
}));
export const sendToPublisher = handle(async (req, res) => res.json({
  success: true,
  message: 'Surat persetujuan telah dikirim ke penerbit.',
  data: await masterRequestService.sendLetterToPublisher(req.params.id, req.user, req),
}));
export const getInternalLetter = handle(async (req, res) =>
  sendPdf(res, await masterRequestService.getInternalLetterPdf(req.params.id)));

// ---- Kepala LPMQ (Pusat Tanda Tangan) ----
export const listForSignature = handle(async (req, res) =>
  res.json({ success: true, data: await masterRequestService.listLettersForSignature() }));
export const sign = handle(async (req, res) => res.json({
  success: true,
  message: 'Surat persetujuan master berhasil ditandatangani.',
  data: await masterRequestService.signMasterLetter(req.params.id, req.user, req),
}));
