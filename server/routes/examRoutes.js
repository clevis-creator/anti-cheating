import { Router } from 'express';
import {
  getExams,
  getExam,
  getExamAssignments,
  createExam,
  updateExam,
  publishExam,
  deleteExam,
  duplicateExam,
} from '../controllers/examController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { examValidator, examUpdateValidator } from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/', getExams);
router.get('/:id/assignments', authorize('admin', 'teacher'), getExamAssignments);
router.get('/:id', getExam);
router.post('/', authorize('admin', 'teacher'), examValidator, validate, createExam);
router.put('/:id', authorize('admin', 'teacher'), examUpdateValidator, validate, updateExam);
router.post('/:id/publish', authorize('admin', 'teacher'), publishExam);
router.post('/:id/duplicate', authorize('admin', 'teacher'), duplicateExam);
router.delete('/:id', authorize('admin', 'teacher'), deleteExam);

export default router;
