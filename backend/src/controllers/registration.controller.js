import registrationService from '../services/registration.service.js';

export const createDraft = async (req, res, next) => {
  try {
    const result = await registrationService.createDraft(req.body, req.user, req);
    res.status(201).json({
      success: true,
      message: 'Draf pengajuan pentashihan berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const submitRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await registrationService.submitRegistration(id, req.user, req);
    res.status(200).json({
      success: true,
      message: 'Pengajuan pentashihan berhasil disubmit.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const transitionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { to_status, notes } = req.body;
    const result = await registrationService.transitionStatus(id, to_status, notes, req.user, req);
    res.status(200).json({
      success: true,
      message: `Status berhasil diubah menjadi ${to_status}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listRegistrations = async (req, res, next) => {
  try {
    const { my_tasks, status, search, page, limit } = req.query;
    const result = await registrationService.listRegistrations({
      user: req.user,
      myTasks: my_tasks,
      status,
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await registrationService.getDetail(id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const addManuscriptFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await registrationService.addManuscriptFile(id, req.body, req.user, req);
    res.status(201).json({
      success: true,
      message: 'Berkas naskah mushaf berhasil diunggah/ditambahkan.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listManuscriptFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await registrationService.listManuscriptFiles(id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createDraft,
  submitRegistration,
  transitionStatus,
  listRegistrations,
  getDetail,
  addManuscriptFile,
  listManuscriptFiles,
};
