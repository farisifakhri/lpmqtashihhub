import * as faqService from '../services/faq.service.js';

export async function listPublicFaqs(req, res, next) {
  try {
    const result = await faqService.listPublicFaqs(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function listAdminFaqs(req, res, next) {
  try {
    const result = await faqService.listAdminFaqs(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getAdminFaq(req, res, next) {
  try {
    const faq = await faqService.getAdminFaq(req.params.id);
    return res.status(200).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
}

export async function createFaq(req, res, next) {
  try {
    const faq = await faqService.createFaq({ data: req.body, user: req.user, req });
    return res.status(201).json({ success: true, message: 'FAQ berhasil disimpan.', data: faq });
  } catch (error) {
    next(error);
  }
}

export async function updateFaq(req, res, next) {
  try {
    const faq = await faqService.updateFaq({ id: req.params.id, data: req.body, user: req.user, req });
    return res.status(200).json({ success: true, message: 'FAQ berhasil diperbarui.', data: faq });
  } catch (error) {
    next(error);
  }
}

export async function deleteFaq(req, res, next) {
  try {
    await faqService.deleteFaq({ id: req.params.id, user: req.user, req });
    return res.status(200).json({ success: true, message: 'FAQ berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
