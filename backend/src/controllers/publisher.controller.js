import publisherService from '../services/publisher.service.js';

export const getMyProfile = async (req, res, next) => {
  try {
    if (!req.user.publisherId) {
      return res.status(404).json({
        success: false,
        message: 'Profil penerbit belum terdaftar untuk akun ini.',
      });
    }

    const publisher = await publisherService.getProfile(req.user.publisherId);
    res.status(200).json({
      success: true,
      data: publisher,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    if (!req.user.publisherId) {
      return res.status(404).json({
        success: false,
        message: 'Profil penerbit belum terdaftar untuk akun ini.',
      });
    }

    const updated = await publisherService.updateProfile(req.user.publisherId, req.body, req);
    res.status(200).json({
      success: true,
      message: 'Profil penerbit berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const listPublishers = async (req, res, next) => {
  try {
    const { status, search, page, limit } = req.query;
    const result = await publisherService.listPublishers({ status, search, page, limit });
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPublisher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await publisherService.verifyPublisher(id, req.body, req);
    res.status(200).json({
      success: true,
      message: 'Status verifikasi penerbit berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyProfile,
  updateMyProfile,
  listPublishers,
  verifyPublisher,
};
