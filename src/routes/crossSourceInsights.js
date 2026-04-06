// src/routes/crossSourceInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/news/cross-source/daily
router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT date, source, positive, negative, neutral, top_entities
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 200
      `
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("crossSourceInsights /daily error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/news/cross-source/weekly
router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT week_start, week_end, source, positive, negative, neutral, top_entities
      FROM news_weekly_summary
      ORDER BY week_start DESC, source ASC
      LIMIT 200
      `
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("crossSourceInsights /weekly error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
