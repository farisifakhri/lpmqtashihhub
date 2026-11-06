import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as survey from '../services/survey.service.js';
import * as v from '../validators/survey.validator.js';

const router = Router();
const superadmin = [authenticate, authorize('SUPERADMIN')];

const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); }
  catch (error) { next(error); }
};

// Unsur survei
router.get('/admin/survey-unsur', ...superadmin, validate(v.listUnsurSchema), action(req => survey.listUnsur(req.query)));
router.post('/admin/survey-unsur/restore-standard', ...superadmin, action(req => survey.restoreStandardUnsur(req.user, req)));
router.post('/admin/survey-unsur', ...superadmin, validate(v.createUnsurSchema), action(req => survey.createUnsur(req.body, req.user, req), 201));
router.put('/admin/survey-unsur/reorder', ...superadmin, validate(v.reorderSchema), action(req => survey.reorderUnsur(req.body.ids, req.user, req)));
router.put('/admin/survey-unsur/:id', ...superadmin, validate(v.updateUnsurSchema), action(req => survey.updateUnsur(req.params.id, req.body, req.user, req)));
router.delete('/admin/survey-unsur/:id', ...superadmin, validate(v.unsurIdSchema), action(req => survey.deleteUnsur(req.params.id, req.query, req.user, req)));

// Bank pertanyaan
router.get('/admin/survey-questions', ...superadmin, validate(v.listQuestionsSchema), action(req => survey.listQuestions(req.query)));
router.post('/admin/survey-questions/seed-standard', ...superadmin, action(req => survey.seedStandardQuestions(req.user, req)));
router.post('/admin/survey-questions', ...superadmin, validate(v.createQuestionSchema), action(req => survey.createQuestion(req.body, req.user, req), 201));
router.put('/admin/survey-questions/:id', ...superadmin, validate(v.updateQuestionSchema), action(req => survey.updateQuestion(req.params.id, req.body, req.user, req)));
router.post('/admin/survey-questions/:id/duplicate', ...superadmin, validate(v.questionIdSchema), action(req => survey.duplicateQuestion(req.params.id, req.user, req), 201));
router.delete('/admin/survey-questions/:id', ...superadmin, validate(v.questionIdSchema), action(req => survey.deleteQuestion(req.params.id, req.query, req.user, req)));

// Survei
router.get('/admin/surveys', ...superadmin, validate(v.listSurveysSchema), action(req => survey.listSurveys(req.query)));
router.post('/admin/surveys', ...superadmin, validate(v.createSurveySchema), action(req => survey.createSurvey(req.body, req.user, req), 201));
router.get('/admin/surveys/:id', ...superadmin, validate(v.surveyIdSchema), action(req => survey.getSurvey(req.params.id)));
router.put('/admin/surveys/reorder', ...superadmin, validate(v.reorderSchema), action(req => survey.reorderSurveys(req.body.ids, req.user, req)));
router.put('/admin/surveys/:id', ...superadmin, validate(v.updateSurveySchema), action(req => survey.updateSurvey(req.params.id, req.body, req.user, req)));
router.delete('/admin/surveys/:id', ...superadmin, validate(v.surveyIdSchema), action(req => survey.deleteSurvey(req.params.id, req.query, req.user, req)));
router.put('/admin/surveys/:id/items', ...superadmin, validate(v.setSurveyItemsSchema), action(req => survey.setSurveyItems(req.params.id, req.body.items, req.user, req)));
router.post('/admin/surveys/:id/activate', ...superadmin, validate(v.surveyIdSchema), action(req => survey.setSurveyStatus(req.params.id, 'AKTIF', req.user, req)));
router.post('/admin/surveys/:id/deactivate', ...superadmin, validate(v.surveyIdSchema), action(req => survey.setSurveyStatus(req.params.id, 'NONAKTIF', req.user, req)));
router.post('/admin/surveys/:id/duplicate', ...superadmin, validate(v.surveyIdSchema), action(req => survey.duplicateSurvey(req.params.id, req.user, req), 201));
router.get('/admin/surveys/:id/responses', ...superadmin, validate(v.listResponsesSchema), action(req => survey.listResponses(req.params.id, req.query)));
router.get('/admin/surveys/:id/report', ...superadmin, validate(v.surveyIdSchema), action(req => survey.getSurveyReport(req.params.id)));

// Survei untuk penerbit: wajib diisi sebelum STT dapat dicetak.
const penerbit = [authenticate, authorize('PENERBIT', 'SUPERADMIN')];
router.get('/registrations/:registrationId/surveys', ...penerbit, validate(v.registrationSurveySchema), action(req => survey.listSurveysForRegistration(req.params.registrationId)));
router.post('/registrations/:registrationId/surveys/:surveyId/response', ...penerbit, validate(v.submitSurveyResponseSchema),
  action(req => survey.submitSurveyResponse(req.params.surveyId, req.params.registrationId, req.body, req.user, req), 201));

export default router;
