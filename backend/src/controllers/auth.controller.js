import authService from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const registerPublisher = async (req, res, next) => {
  try {
    const result = await authService.registerPublisher(req.body, req);

    res.status(201).json({
      success: true,
      message: 'Pendaftaran penerbit berhasil.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword({
      email: req.body.email,
      req,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      token: req.body.token,
      new_password: req.body.new_password,
      req,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword({
      user: req.user,
      current_password: req.body.current_password,
      new_password: req.body.new_password,
      req,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export default { login, registerPublisher, getMe, forgotPassword, resetPassword, changePassword };
