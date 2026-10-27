import * as regulationService from '../services/regulation.service.js';
import { REGULATION_CATEGORIES } from '../validators/regulation.validator.js';

/**
 * Format string filename agar aman dari karakter khusus HTTP header
 */
function sanitizeHeaderFilename(fileName) {
  return (fileName || 'dokumen.pdf').replace(/[\\/:*?"<>|\r\n]/g, '_');
}

/**
 * Mengambil daftar regulasi publik
 * GET /api/v1/regulations
 */
export async function getPublicRegulations(req, res, next) {
  try {
    const result = await regulationService.listPublicRegulations(req.query);
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mengambil 7 master kategori dokumen regulasi resmi
 * GET /api/v1/regulations/categories
 */
export async function getCategories(req, res) {
  return res.status(200).json({
    success: true,
    data: REGULATION_CATEGORIES,
  });
}

/**
 * Mengambil detail dokumen regulasi publik
 * GET /api/v1/regulations/:id
 */
export async function getPublicRegulationDetail(req, res, next) {
  try {
    const doc = await regulationService.getRegulationById(req.params.id, true);
    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Pratinjau (inline) dokumen PDF regulasi
 * GET /api/v1/regulations/:id/view
 */
export async function viewRegulationFile(req, res, next) {
  try {
    const { bytes, fileName, mimeType, fileSize } = await regulationService.getRegulationFileContent(
      req.params.id,
      req.user
    );

    const safeName = sanitizeHeaderFilename(fileName);
    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Content-Length', fileSize || bytes.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(bytes);
  } catch (error) {
    next(error);
  }
}

/**
 * Mengunduh (attachment) dokumen PDF regulasi
 * GET /api/v1/regulations/:id/download
 */
export async function downloadRegulationFile(req, res, next) {
  try {
    const { bytes, fileName, mimeType, fileSize } = await regulationService.getRegulationFileContent(
      req.params.id,
      req.user
    );

    const safeName = sanitizeHeaderFilename(fileName);
    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', fileSize || bytes.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(bytes);
  } catch (error) {
    next(error);
  }
}

/**
 * Mengambil daftar regulasi internal admin (Superadmin & Helper Admin)
 * GET /api/v1/admin/regulations
 */
export async function getAdminRegulations(req, res, next) {
  try {
    const result = await regulationService.listAdminRegulations(req.query);
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mengambil ringkasan statistik dokumen regulasi
 * GET /api/v1/admin/regulations/summary
 */
export async function getAdminSummary(req, res, next) {
  try {
    const summary = await regulationService.getRegulationSummary();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mengunggah dokumen regulasi baru
 * POST /api/v1/admin/regulations
 */
export async function createRegulation(req, res, next) {
  try {
    const newDoc = await regulationService.createRegulation({
      file: req.file,
      data: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Dokumen regulasi berhasil diunggah dan disimpan.',
      data: newDoc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Memperbarui dokumen regulasi
 * PUT /api/v1/admin/regulations/:id
 */
export async function updateRegulation(req, res, next) {
  try {
    const updated = await regulationService.updateRegulation(req.params.id, {
      file: req.file,
      data: req.body,
      user: req.user,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Dokumen regulasi berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Menghapus dokumen regulasi
 * DELETE /api/v1/admin/regulations/:id
 */
export async function deleteRegulation(req, res, next) {
  try {
    const result = await regulationService.deleteRegulation(req.params.id, {
      user: req.user,
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

