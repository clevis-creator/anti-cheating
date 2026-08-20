import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  getAuditLogs,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/stats', authorize('admin'), getDashboardStats);
router.get('/audit-logs', authorize('admin'), getAuditLogs);
router.get('/', authorize('admin', 'teacher'), getUsers);
router.get('/:id', authorize('admin', 'teacher'), getUser);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
