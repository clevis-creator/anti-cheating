import { Router } from 'express';
import {
  getExamReport,
  getPerformanceAnalytics,
  exportReport,
  getLiveMonitoring,
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/analytics', authorize('admin', 'teacher'), getPerformanceAnalytics);
router.get('/exam/:examId', authorize('admin', 'teacher'), getExamReport);
router.get('/live/:examId', authorize('admin', 'teacher'), getLiveMonitoring);
router.post('/export', authorize('admin', 'teacher'), exportReport);

export default router;
