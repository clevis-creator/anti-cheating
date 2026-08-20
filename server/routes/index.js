import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import courseRoutes from './courseRoutes.js';
import examRoutes from './examRoutes.js';
import questionRoutes from './questionRoutes.js';
import responseRoutes from './responseRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportRoutes from './reportRoutes.js';
import ssoRoutes from './ssoRoutes.js';
import ltiRoutes from './ltiRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'ExamAI API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/responses', responseRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/sso', ssoRoutes);
router.use('/lti', ltiRoutes);

export default router;
