import masterService from '../services/master.service.js';

// -------------------------------------------------------------
// 1. KATEGORI MUSHAF (MUSHAF CATEGORIES)
// -------------------------------------------------------------

export const listCategories = async (req, res, next) => {
  try {
    const categories = await masterService.getCategories(req.query);
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const category = await masterService.getCategoryById(req.params.id);
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await masterService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: 'Kategori naskah berhasil ditambahkan.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await masterService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Kategori naskah berhasil diperbarui.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await masterService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Kategori naskah berhasil dinonaktifkan.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 2. PROFIL LAYANAN & TARIF (SERVICE TYPES)
// -------------------------------------------------------------

export const listServiceTypes = async (req, res, next) => {
  try {
    const serviceTypes = await masterService.getServiceTypes(req.query);
    res.status(200).json({
      success: true,
      data: serviceTypes,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceType = async (req, res, next) => {
  try {
    const serviceType = await masterService.getServiceTypeById(req.params.id);
    res.status(200).json({
      success: true,
      data: serviceType,
    });
  } catch (error) {
    next(error);
  }
};

export const createServiceType = async (req, res, next) => {
  try {
    const serviceType = await masterService.createServiceType(req.body);
    res.status(201).json({
      success: true,
      message: 'Jenis layanan pentashihan berhasil ditambahkan.',
      data: serviceType,
    });
  } catch (error) {
    next(error);
  }
};

export const updateServiceType = async (req, res, next) => {
  try {
    const serviceType = await masterService.updateServiceType(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Jenis layanan pentashihan berhasil diperbarui.',
      data: serviceType,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteServiceType = async (req, res, next) => {
  try {
    const serviceType = await masterService.deleteServiceType(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Jenis layanan pentashihan berhasil dinonaktifkan.',
      data: serviceType,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 3. LAYANAN TAMBAHAN (SERVICE ADDONS)
// -------------------------------------------------------------

export const listAddons = async (req, res, next) => {
  try {
    const addons = await masterService.getAddons(req.query);
    res.status(200).json({
      success: true,
      data: addons,
    });
  } catch (error) {
    next(error);
  }
};

export const getAddon = async (req, res, next) => {
  try {
    const addon = await masterService.getAddonById(req.params.id);
    res.status(200).json({
      success: true,
      data: addon,
    });
  } catch (error) {
    next(error);
  }
};

export const createAddon = async (req, res, next) => {
  try {
    const addon = await masterService.createAddon(req.body);
    res.status(201).json({
      success: true,
      message: 'Layanan tambahan berhasil ditambahkan.',
      data: addon,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddon = async (req, res, next) => {
  try {
    const addon = await masterService.updateAddon(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Layanan tambahan berhasil diperbarui.',
      data: addon,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddon = async (req, res, next) => {
  try {
    const addon = await masterService.deleteAddon(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Layanan tambahan berhasil dinonaktifkan.',
      data: addon,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 4. TIM DISTRIBUSI (DISTRIBUTION TEAMS)
// -------------------------------------------------------------

export const listDistributionTeams = async (req, res, next) => {
  try {
    const teams = await masterService.getDistributionTeams();
    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listServiceTypes,
  getServiceType,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  listAddons,
  getAddon,
  createAddon,
  updateAddon,
  deleteAddon,
  listDistributionTeams,
};
