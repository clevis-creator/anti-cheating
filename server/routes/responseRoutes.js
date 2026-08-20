import { Router } from 'express';
import {
  startExam,
  saveProgress,
  submitExam,
  uploadProctoringMedia,
  logWarning,
  logActivity,
  getMyResponses,
  getResponse,
  getExamResponses,
  getPendingGrading,
} from '../controllers/responseController.js';
import {
  manualGrade,
  overrideAIGrade,
  regradeWithAI,
  publishResults,
  getResults,
  getResult,
  getCertificate,
  getTeacherStats,
  getStudentStats,
} from '../controllers/gradingController.js';
import { getMediaAccessUrl, downloadMedia } from '../controllers/mediaController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireExamSession } from '../middleware/examSession.js';
import { upload } from '../utils/upload.js';

const router = Router();

// Signed media URLs — no JWT required (token is in query string)
router.get('/media/download', downloadMedia);

router.use(protect);

router.get('/my', getMyResponses);
router.get('/pending', authorize('admin', 'teacher'), getPendingGrading);
router.get('/stats/teacher', authorize('admin', 'teacher'), getTeacherStats);
router.get('/stats/student', authorize('student'), getStudentStats);
router.get('/results', getResults);
router.get('/results/:id', getResult);
router.get('/results/:id/certificate', getCertificate);
router.get('/exam/:examId', authorize('admin', 'teacher'), getExamResponses);
router.post('/exam/:examId/start', authorize('student'), startExam);
router.post('/exam/:examId/publish', authorize('admin', 'teacher'), publishResults);
router.get('/:id', getResponse);
router.get('/:id/media/:filename/access', getMediaAccessUrl);
router.put('/:id/save', authorize('student'), requireExamSession, saveProgress);
router.post('/:id/submit', authorize('student'), requireExamSession, submitExam);
router.post('/:id/warning', authorize('student'), logWarning);
router.post('/:id/activity', authorize('student'), requireExamSession, logActivity);
router.post('/:id/media', authorize('student'), requireExamSession, upload.single('file'), uploadProctoringMedia);
router.post('/:id/grade', authorize('admin', 'teacher'), manualGrade);
router.post('/:id/regrade-ai', authorize('admin', 'teacher'), regradeWithAI);
router.put('/ai-grades/:id/override', authorize('admin', 'teacher'), overrideAIGrade);

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({
    success: true,
    data: { url: `/uploads/${req.file.filename}`, filename: req.file.filename },
  });
});

export default router;
