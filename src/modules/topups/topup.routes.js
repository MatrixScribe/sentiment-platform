import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { handleTopup } from './topup.controller.js';

const router = Router();

router.post('/', requireAuth, handleTopup);

export default router;
