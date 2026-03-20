// src/routes/crossSourceInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const {
  crossSourceDailyTransform,
  crossSourceDivergenceTrendTransform,
  crossSourceEntitiesTransform,
  crossSourceAlertsTransform
} = require("../utils/crossSourceTransformers");

// ---------------- DAILY CROSS-SOURCE SUMMARY ----------------
router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM cross_source_daily
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: crossSourceDailyTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- SENTIMENT DIVERGENCE TREND ----------------
router.get("/divergence", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, sentiment_divergence_score
      FROM cross_source_daily
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: crossSourceDivergenceTrendTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- ENTITY OVERLAP ----------------
router.get("/entities", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, shared_entities, reddit_unique_entities, news_unique_entities
      FROM cross_source_daily
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: crossSourceEntitiesTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- EARLY WARNING SIGNALS ----------------
router.get("/alerts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        date,
        sentiment_divergence_score,
        shared_entities,
        reddit_unique_entities,
        news_unique_entities
      FROM cross_source_daily
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: crossSourceAlertsTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
