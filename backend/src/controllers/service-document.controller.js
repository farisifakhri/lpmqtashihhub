import * as serviceDocumentService from '../services/service-document.service.js';

function safeHeaderFilename(fileName) {
  const normalizedName = (fileName || 'dokumen.pdf').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_');
  const safeName = normalizedName.replace(/[^\x20-\x7E]/g, '_');
  const encodedName = encodeURIComponent(normalizedName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return { safeName, encodedName };
}

async function sendDocument(req, res, next, allowDraft) {
  try {
    const { bytes, document } = await serviceDocumentService.getServiceDocumentFile(req.params.id, allowDraft);
    const { safeName, encodedName } = safeHeaderFilename(document.file_name);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Length', bytes.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(bytes);
  } catch (error) {
    next(error);
  }
}

export async function listPublicServiceDocuments(req, res, next) {
  try {
    const result = await serviceDocumentService.listPublicServiceDocuments(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function listAdminServiceDocuments(req, res, next) {
  try {
    const result = await serviceDocumentService.listAdminServiceDocuments(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function downloadPublicServiceDocument(req, res, next) {
  return sendDocument(req, res, next, false);
}

export async function downloadAdminServiceDocument(req, res, next) {
  return sendDocument(req, res, next, true);
}

export async function createServiceDocument(req, res, next) {
  try {
    const document = await serviceDocumentService.createServiceDocument({
      data: req.body,
      file: req.file,
      user: req.user,
      req,
    });
    return res.status(201).json({ success: true, message: 'Dokumen berhasil disimpan.', data: document });
  } catch (error) {
    next(error);
  }
}

export async function updateServiceDocument(req, res, next) {
  try {
    const document = await serviceDocumentService.updateServiceDocument({
      id: req.params.id,
      data: req.body,
      file: req.file,
      user: req.user,
      req,
    });
    return res.status(200).json({ success: true, message: 'Dokumen berhasil diperbarui.', data: document });
  } catch (error) {
    next(error);
  }
}

export async function deleteServiceDocument(req, res, next) {
  try {
    await serviceDocumentService.deleteServiceDocument({ id: req.params.id, user: req.user, req });
    return res.status(200).json({ success: true, message: 'Dokumen berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
