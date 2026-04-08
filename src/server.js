// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const authMiddleware = require("./middleware/authMiddleware");

// -------------------- ENV VALIDATION --------------------
if (!process.env.API_BASE_URL) {
  console.warn("⚠️  WARNING: API_BASE_URL is missing. Using fallback: http://localhost:4000");
  process.env.API_BASE_URL = "http://localhost:4000";
}

console.log("🌍 API_BASE_URL:", process.env.API_BASE_URL);

// -------------------- GLOBAL MIDDLEWARE --------------------
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options(/.*/, cors());

// -------------------- HEALTH ENDPOINTS --------------------
app.get("/status", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/version", (req, res) => {
  res.json({ version: "1.0.0", env: process.env.NODE_ENV });
});

// -------------------- PUBLIC ROUTES --------------------
app.use("/api", require("./routes/dbTest"));
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/paypal", require("./routes/paypalRoutes"));
app.use("/api/paypal/orders", require("./routes/paypalOrders"));
app.use("/api/paypal/invoices", require("./routes/paypalInvoices"));
app.use("/api/paypal/webhook", require("./routes/paypalWebhook"));

// -------------------- PROTECTED ROUTES --------------------

// Entity detection (NLP extraction)
app.use("/api/entities", authMiddleware, require("./routes/entityDetectRoute"));

// ⭐ NEW: Your live entity details route (the one you created)
app.use("/api/entity", authMiddleware, require("./routes/entity"));  
// If your file is named entityRoute.js, change to require("./routes/entityRoute")

// Insights
app.use("/api/insights/news", authMiddleware, require("./routes/newsInsightsUnified"));
app.use("/api/insights/reddit", authMiddleware, require("./routes/redditInsights"));
app.use("/api/insights/cross-source", authMiddleware, require("./routes/crossSourceInsights"));
app.use("/api/insights/narrative", authMiddleware, require("./routes/narrativeShiftInsights"));
app.use("/api/insights/narrative/alerts-store", authMiddleware, require("./routes/narrativeAlerts"));

// Analytics
app.use("/api/analytics", authMiddleware, require("./routes/analyticsRoute"));

// Ingestion
app.use("/api/ingest", authMiddleware, require("./routes/manualIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/redditIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/newsIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/reutersIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/bbcIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/dwIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/aljazeeraIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/france24IngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/news24IngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/dailyMaverickIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/timesliveIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/ewnIngestRoute"));
app.use("/api/ingest", authMiddleware, require("./routes/iolIngestRoute"));

// -------------------- CRON --------------------
require("./cron/scheduler");

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
