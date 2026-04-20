import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { loadWallet } from './wallet.controller.js';

const router = Router();

router.post('/load', requireAuth, loadWallet);

export default router;
