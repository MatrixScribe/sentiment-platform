import { Router } from 'express';
import { adminLogin } from './admin.controller.js';
import { requireAdmin } from './admin.middleware.js';

import { createFeeRule, listFeeRules, updateFeeRule } from './fee.controller.js';
import { setFxRate, listFxRates } from './fx.controller.js';
import { listOperators, toggleOperator } from './operator.controller.js';
import { listProducts, toggleProduct } from './product.controller.js';
import { adminRefund } from './refund.controller.js';
import { listTransactions, getTransaction } from './transaction.controller.js';

const router = Router();

// Auth
router.post('/auth/login', adminLogin);

// Fees
router.post('/fees', requireAdmin, createFeeRule);
router.get('/fees', requireAdmin, listFeeRules);
router.put('/fees/:id', requireAdmin, updateFeeRule);

// FX
router.post('/fx', requireAdmin, setFxRate);
router.get('/fx', requireAdmin, listFxRates);

// Operators
router.get('/operators', requireAdmin, listOperators);
router.put('/operators/:id', requireAdmin, toggleOperator);

// Products
router.get('/products', requireAdmin, listProducts);
router.put('/products/:id', requireAdmin, toggleProduct);

// Refunds
router.post('/refund', requireAdmin, adminRefund);

// Transactions
router.get('/transactions', requireAdmin, listTransactions);
router.get('/transactions/:id', requireAdmin, getTransaction);

export default router;
