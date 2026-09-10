import masterService from '../services/master.service.js';

export const listCategories = async (req, res, next) => {
  try {
    const categories = await masterService.getCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const listServiceTypes = async (req, res, next) => {
  try {
    const { category_id } = req.query;
    const serviceTypes = await masterService.getServiceTypes(category_id);
    res.status(200).json({
      success: true,
      data: serviceTypes,
    });
  } catch (error) {
    next(error);
  }
};

export const listAddons = async (req, res, next) => {
  try {
    const addons = await masterService.getAddons();
    res.status(200).json({
      success: true,
      data: addons,
    });
  } catch (error) {
    next(error);
  }
};

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
  listServiceTypes,
  listAddons,
  listDistributionTeams,
};
