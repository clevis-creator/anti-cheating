import { Router } from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  enrollStudents,
  removeStudent,
  deleteCourse,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { courseValidator } from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', authorize('admin', 'teacher'), courseValidator, validate, createCourse);
router.put('/:id', authorize('admin', 'teacher'), updateCourse);
router.post('/:id/enroll', authorize('admin', 'teacher'), enrollStudents);
router.delete('/:id/students/:studentId', authorize('admin', 'teacher'), removeStudent);
router.delete('/:id', authorize('admin', 'teacher'), deleteCourse);

export default router;
