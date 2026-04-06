// src/routes/newsInsightsUnified.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/news/insights/unified/overview
router.get("/overview", async (req, res) => {
  try {
    const daily = await pool.query(
      `
      SELECT *
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 100
      `
    );

    const weekly = await pool.query(
      `
      SELECT *
      FROM news_weekly_summary
      ORDER BY week_start DESC, source ASC
      LIMIT 50
      `
    );

    const insights = await pool.query(
      `
      SELECT *
      FROM insights
      WHERE tenant_id = 'global'
      ORDER BY date DESC
      LIMIT 30
      `
    );

    res.json({
      success: true,
      data: {
        daily: daily.rows,
        weekly: weekly.rows,
        insights: insights.rows
      }
    });
  } catch (err) {
    console.error("newsInsightsUnified /overview error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/news/insights/unified/narratives
router.get("/narratives", async (req, res) => {
  try {
    const signals = await pool.query(
      `
      SELECT *
      FROM narrative_signals
      ORDER BY date DESC
      LIMIT 100
      `
    );

    res.json({
      success: true,
      data: signals.rows
    });
  } catch (err) {
    console.error("newsInsightsUnified /narratives error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
