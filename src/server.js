const express = require('express');
const app = express();
require('dotenv').config();

const authMiddleware = require('./middleware/authMiddleware');

// Middleware
app.use(express.json());

// Existing Routes
const processRoute = require('./routes/processRoute');
const analyticsRoute = require('./routes/analyticsRoute');
const authRoute = require('./routes/authRoute');

// PayPal Routes
const paypalRoutes = require('./routes/paypalRoutes');          // Subscriptions
const paypalOrders = require('./routes/paypalOrders');          // One-time Orders
const paypalInvoices = require('./routes/paypalInvoices');      // Invoicing
const paypalWebhook = require('./routes/paypalWebhook');        // Webhooks

// NEW: Insights Routes
const redditInsights = require('./routes/redditInsights');
const newsInsights = require('./routes/newsInsights');
const crossSourceInsights = require('./routes/crossSourceInsights');
const narrativeShiftInsights = require('./routes/narrativeShiftInsights');
const narrativeAlerts = require('./routes/narrativeAlerts');

// Public routes
app.use('/api/auth', authRoute);

// PayPal subscription creation (public)
app.use('/api/paypal', paypalRoutes);

// PayPal one-time orders (public)
app.use('/api/paypal/orders', paypalOrders);

// PayPal invoicing (public)
app.use('/api/paypal/invoices', paypalInvoices);

// PayPal webhook (public, must NOT be protected)
app.use('/api/paypal/webhook', paypalWebhook);

// Reddit Insights (protected)
app.use('/api/insights/reddit', authMiddleware, redditInsights);

// News Insights (protected)
app.use('/api/insights/news', authMiddleware, newsInsights);

// Cross‑Source Insights (protected)
app.use('/api/insights/cross-source', authMiddleware, crossSourceInsights);

// Narrative Shift Detection (protected)
app.use('/api/insights/narrative', authMiddleware, narrativeShiftInsights);

// Narrative Alerts Store (protected)
app.use('/api/insights/narrative/alerts-store', authMiddleware, narrativeAlerts);

// Protected routes
app.use('/api/process', authMiddleware, processRoute);
app.use('/api/analytics', authMiddleware, analyticsRoute);

// 🔥 Start Cron Jobs (Daily Intelligence Pipeline)
require('./cron/scheduler'); // <-- Starts cron jobs

// Server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
