// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { ENV } from './src/config/env.js';

// ROUTES
import routes from './src/routes/index.js';
import webhookRoutes from './src/modules/webhooks/webhook.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import paystackRoutes from './src/modules/payments/paystack/paystack.routes.js';
import { paystackWebhook } from './src/modules/payments/paystack/paystack.controller.js';
import authRoutes from "./src/routes/auth.js";

// OPTIONAL: Reloadly test
import { testReloadly } from './src/modules/aggregators/reloadly/reloadly.test.js';

const app = express();

// -----------------------------
// 1. AUTH ROUTES (JSON)
// -----------------------------
app.use("/auth", authRoutes);

// -----------------------------
// 2. CORS
// -----------------------------
app.use(cors());

// -----------------------------
// 3. PAYSTACK WEBHOOK (RAW BODY)
// MUST come BEFORE express.json()
// -----------------------------
app.post(
  '/wallet/load/paystack/webhook',
  express.raw({ type: '*/*' }),
  paystackWebhook
);

// -----------------------------
// 4. JSON BODY FOR EVERYTHING ELSE
// -----------------------------
app.use(express.json());

// -----------------------------
// 5. PAYSTACK INITIATE ROUTES
// -----------------------------
app.use('/wallet/load/paystack', paystackRoutes);

// -----------------------------
// 6. OTHER ROUTES
// -----------------------------
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api', routes);
app.use('/', routes);

// -----------------------------
// 7. START SERVER
// -----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);

  // Reloadly connectivity test
  (async () => {
    try {
      console.log("Testing Reloadly connectivity...");
      await testReloadly();
      console.log("Reloadly test completed.");
    } catch (err) {
      console.error("Reloadly test failed:", err.message);
    }
  })();
});