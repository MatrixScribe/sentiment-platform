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

// OPTIONAL: Reloadly test
import { testReloadly } from './src/modules/aggregators/reloadly/reloadly.test.js';

const app = express();

app.use(cors());

// RAW BODY ONLY FOR PAYSTACK WEBHOOK
app.post(
  '/wallet/load/paystack/webhook',
  express.raw({ type: '*/*' }),
  paystackWebhook
);

// JSON FOR EVERYTHING ELSE
app.use(express.json());

// ROUTE MOUNTING
app.use('/wallet/load/paystack', paystackRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api', routes);
app.use('/', routes);

// Render dynamic port
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);

  // Run Reloadly test AFTER server starts (non-blocking)
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
