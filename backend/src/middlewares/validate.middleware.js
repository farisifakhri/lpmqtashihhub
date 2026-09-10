import { ZodError } from 'zod';
import { validationMessage } from '../utils/user-messages.js';

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(issue => ({ field: issue.path.join('.'), message: validationMessage(issue) }));
      const messages = [...new Set(errors.map(issue => issue.message))];
      return res.status(400).json({
        success: false,
        message: `Periksa isian Anda: ${messages.slice(0, 3).join(' ')}${messages.length > 3 ? ' Periksa juga isian lainnya yang belum sesuai.' : ''}`,
        errors,
      });
    }
    next(error);
  }
};

export default validate;
