import { Router } from 'express';
import { ssoRedirect, ssoCallback } from '../controllers/ssoController.js';

const router = Router();

router.get('/redirect', ssoRedirect);
router.get('/callback', ssoCallback);

export default router;
