import * as publisherRegistrationService from '../services/publisher-registration.service.js';

/**
 * Controller untuk alur pendaftaran akun penerbit (T-F06)
 * Mengacu ke docs/api/KONTRAK_PENDAFTARAN_PENERBIT.md
 */

export async function registerPublisher(req, res, next) {
  try {
    const result = await publisherRegistrationService.registerPublisher(req.body, req.files);
    return res.status(201).json({
      success: true,
      message: 'Pendaftaran akun penerbit berhasil diajukan. Simpan kode pendaftaran Anda untuk memantau status.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function checkStatus(req, res, next) {
  try {
    const { kode_pendaftaran } = req.body;
    const result = await publisherRegistrationService.checkPublisherRegistrationStatus(kode_pendaftaran);
    return res.status(200).json({
      success: true,
      message: 'Status pendaftaran berhasil ditemukan.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRevision(req, res, next) {
  try {
    const { token } = req.params;
    const result = await publisherRegistrationService.getPublisherRegistrationRevision(token);
    return res.status(200).json({
      success: true,
      message: 'Data perbaikan berhasil dimuat.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitRevision(req, res, next) {
  try {
    const { token } = req.params;
    const result = await publisherRegistrationService.submitPublisherRegistrationRevision(token, req.body, req.files);
    return res.status(200).json({
      success: true,
      message: 'Perbaikan pendaftaran berhasil dikirim. Petugas akan memverifikasi ulang permohonan Anda.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRegistrations(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const result = await publisherRegistrationService.listAdminPublisherRegistrations({ page, limit, status, search });
    return res.status(200).json({
      success: true,
      message: 'Daftar pendaftaran penerbit berhasil diambil.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRegistrationDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await publisherRegistrationService.getAdminPublisherRegistrationDetail(id);
    return res.status(200).json({
      success: true,
      message: 'Detail pendaftaran penerbit berhasil diambil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req, res, next) {
  try {
    const { id, documentId } = req.params;
    const file = await publisherRegistrationService.getAdminPublisherRegistrationDocument(id, documentId, req.user, req);

    const safeFilename = encodeURIComponent(file.filename);
    res.setHeader('Content-Type', file.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(file.content);
  } catch (error) {
    next(error);
  }
}

export async function decideRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const result = await publisherRegistrationService.decidePublisherRegistration(id, req.body, req.user, req);
    return res.status(200).json({
      success: true,
      message: 'Keputusan pendaftaran berhasil disimpan.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
