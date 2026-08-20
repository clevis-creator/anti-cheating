import { Router } from 'express';
import { ltiLaunch, ltiConfig } from '../controllers/ltiController.js';

const router = Router();

router.post('/launch', ltiLaunch);
router.get('/config', ltiConfig);

export default router;
