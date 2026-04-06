// src/routes/newsInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const {
  newsSentimentTrendTransform,
  newsTopEntitiesTransform,
  newsSourceComparisonTransform,
  newsDailySummaryTransform
} = require("../utils/newsTransformers");

// DAILY
router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: newsDailySummaryTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WEEKLY
router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM news_weekly_summary
      ORDER BY week_start DESC, source ASC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SENTIMENT TREND
router.get("/sentiment-trend/:source", async (req, res) => {
  const { source } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT date, positive, negative, neutral
      FROM news_daily_summary
      WHERE source = $1
      ORDER BY date ASC
      `,
      [source]
    );

    res.json({
      success: true,
      data: newsSentimentTrendTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// TOP ENTITIES
router.get("/top-entities/:source", async (req, res) => {
  const { source } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT date, top_entities
      FROM news_daily_summary
      WHERE source = $1
      ORDER BY date DESC
      LIMIT 7
      `,
      [source]
    );

    res.json({
      success: true,
      data: newsTopEntitiesTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SOURCE COMPARISON
router.get("/compare", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, source, positive, negative, neutral
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: newsSourceComparisonTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW: HIGH‑LEVEL INSIGHTS
router.get("/insights", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM insights
      WHERE tenant_id = 'global'
      ORDER BY date DESC
      LIMIT 50
      `
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("newsInsights /insights error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
