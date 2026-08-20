import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getAIConfig,
  updateAIConfig,
} from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/ai', getAIConfig);
router.put('/ai', updateAIConfig);

export default router;
