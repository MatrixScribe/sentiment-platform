// -------------------- IMPORTS --------------------
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const authMiddleware = require('./middleware/authMiddleware');

// -------------------- GLOBAL MIDDLEWARE --------------------
app.use(express.json());

// CORS (must come BEFORE routes)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Allow preflight to pass through without auth (Express 5 safe)
app.options(/.*/, cors());

// -------------------- ROUTES --------------------

// Public
app.use('/api', require('./routes/dbTest'));
app.use('/api/auth', require('./routes/authRoute'));

// PayPal (public)
app.use('/api/paypal', require('./routes/paypalRoutes'));
app.use('/api/paypal/orders', require('./routes/paypalOrders'));
app.use('/api/paypal/invoices', require('./routes/paypalInvoices'));
app.use('/api/paypal/webhook', require('./routes/paypalWebhook'));

// -------------------- PROTECTED ROUTES --------------------

// ⭐ Unified News Insights Endpoint (NEW)
app.use('/api/insights/news', authMiddleware, require('./routes/newsInsightsUnified'));

// Existing insights routes (still available under subpaths)
app.use('/api/insights/reddit', authMiddleware, require('./routes/redditInsights'));
app.use('/api/insights/cross-source', authMiddleware, require('./routes/crossSourceInsights'));
app.use('/api/insights/narrative', authMiddleware, require('./routes/narrativeShiftInsights'));
app.use('/api/insights/narrative/alerts-store', authMiddleware, require('./routes/narrativeAlerts'));

// Process + Analytics
app.use('/api/process', authMiddleware, require('./routes/processRoute'));
app.use('/api/analytics', authMiddleware, require('./routes/analyticsRoute'));

// -------------------- INGESTION (PROTECTED) --------------------
app.use('/api/ingest', authMiddleware, require('./routes/manualIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/redditIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/newsIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/reutersIngestRoute'));

app.use('/api/ingest', authMiddleware, require('./routes/bbcIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/dwIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/aljazeeraIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/france24IngestRoute'));

app.use('/api/ingest', authMiddleware, require('./routes/news24IngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/dailyMaverickIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/timesliveIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/ewnIngestRoute'));
app.use('/api/ingest', authMiddleware, require('./routes/iolIngestRoute'));

// -------------------- CRON --------------------
require('./cron/scheduler');

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
