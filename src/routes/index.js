import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import topupRoutes from '../modules/topups/topup.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/topup', topupRoutes);

export default router;
