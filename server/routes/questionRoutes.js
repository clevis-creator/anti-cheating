import { Router } from 'express';
import {
  getQuestions,
  getQuestion,
  createQuestion,
  createBulkQuestions,
  updateQuestion,
  reorderQuestions,
  deleteQuestion,
  addToBank,
} from '../controllers/questionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { questionValidator } from '../validators/index.js';

const router = Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/', getQuestions);
router.get('/:id', getQuestion);
router.post('/', questionValidator, validate, createQuestion);
router.post('/bulk', createBulkQuestions);
router.put('/reorder', reorderQuestions);
router.put('/:id', questionValidator, validate, updateQuestion);
router.post('/:id/bank', addToBank);
router.delete('/:id', deleteQuestion);

export default router;
