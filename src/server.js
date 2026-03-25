const express = require('express');
const app = express();
require('dotenv').config();

const authMiddleware = require('./middleware/authMiddleware');

// Middleware
app.use(express.json());

// -------------------- ROUTES --------------------

// DB Test Route (public)
const dbTestRoute = require('./routes/dbTest');

// Existing Routes
const processRoute = require('./routes/processRoute');
const analyticsRoute = require('./routes/analyticsRoute');
const authRoute = require('./routes/authRoute');

// PayPal Routes
const paypalRoutes = require('./routes/paypalRoutes');          // Subscriptions
const paypalOrders = require('./routes/paypalOrders');          // One-time Orders
const paypalInvoices = require('./routes/paypalInvoices');      // Invoicing
const paypalWebhook = require('./routes/paypalWebhook');        // Webhooks

// Insights Routes
const redditInsights = require('./routes/redditInsights');
const newsInsights = require('./routes/newsInsights');
const crossSourceInsights = require('./routes/crossSourceInsights');
const narrativeShiftInsights = require('./routes/narrativeShiftInsights');
const narrativeAlerts = require('./routes/narrativeAlerts');

// -------------------- INGEST ROUTES --------------------
const manualIngestRoute = require('./routes/manualIngestRoute');
const redditIngestRoute = require('./routes/redditIngestRoute');
const newsIngestRoute = require('./routes/newsIngestRoute');
const reutersIngestRoute = require('./routes/reutersIngestRoute');   //
<--- NEW

// -------------------- PUBLIC ROUTES --------------------

app.use('/api', dbTestRoute);       // <--- DB TEST ENDPOINT
app.use('/api/auth', authRoute);

// PayPal (public)
app.use('/api/paypal', paypalRoutes);
app.use('/api/paypal/orders', paypalOrders);
app.use('/api/paypal/invoices', paypalInvoices);
app.use('/api/paypal/webhook', paypalWebhook); // must remain public

// -------------------- PROTECTED ROUTES --------------------

app.use('/api/insights/reddit', authMiddleware, redditInsights);
app.use('/api/insights/news', authMiddleware, newsInsights);
app.use('/api/insights/cross-source', authMiddleware, crossSourceInsights);
app.use('/api/insights/narrative', authMiddleware, narrativeShiftInsights);
app.use('/api/insights/narrative/alerts-store', authMiddleware, narrativeAlerts);

app.use('/api/process', authMiddleware, processRoute);
app.use('/api/analytics', authMiddleware, analyticsRoute);

// Ingestion (protected)
app.use('/api/ingest', authMiddleware, manualIngestRoute);
app.use('/api/ingest', authMiddleware, redditIngestRoute);
app.use('/api/ingest', authMiddleware, newsIngestRoute);
app.use('/api/ingest', authMiddleware, reutersIngestRoute);
   // <--- NEW

// -------------------- CRON JOBS --------------------

require('./cron/scheduler'); // Starts daily intelligence pipeline

// -------------------- SERVER --------------------

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
