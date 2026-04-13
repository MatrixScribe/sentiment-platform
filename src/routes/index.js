// src/routes/index.js
const express = require("express");
const router = express.Router();

// ------------------------------
// INSIGHTS (MATCH FRONTEND)
// ------------------------------
router.use("/insights/news", require("./newsInsightsUnified"));
router.use("/insights/cross-source", require("./crossSourceInsights"));
router.use("/insights/narrative", require("./narrativeShiftInsights"));
router.use("/insights/narrative/alerts-store", require("./narrativeAlerts"));

// ------------------------------
// ANALYTICS
// ------------------------------
router.use("/analytics", require("./analyticsRoute"));

// ------------------------------
// ENTITIES
// ------------------------------
router.use("/entities/top", require("./entitiesTopRoute"));
router.use("/entities/search", require("./entitiesSearchRoute"));
router.use("/entities/list", require("./entitiesListRoute"));

// ------------------------------
// ENTITY DETAILS
// ------------------------------
router.use("/entity", require("./entityRoute"));

module.exports = router;
