// src/modules/payments/paystack/paystack.routes.js
import { Router } from 'express';
import { initiatePaystackPayment } from './paystack.controller.js';

const router = Router();

// INITIATE PAYMENT (normal JSON)
router.post('/initiate', initiatePaystackPayment);

export default router;
