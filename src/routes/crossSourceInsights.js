// src/routes/crossSourceInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// --------------------------------------------------
// ROOT HANDLER — /api/insights/cross-source
// --------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const publishers = await pool.query(`
      SELECT source AS name, COUNT(*) AS count
      FROM articles
      GROUP BY source
      ORDER BY count DESC
      LIMIT 20
    `);

    res.json({
      publishers: publishers.rows
    });
  } catch (err) {
    console.error("crossSourceInsights / root error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// /daily (existing)
// --------------------------------------------------
router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, source, positive, negative, neutral, top_entities
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 200
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("crossSourceInsights /daily error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------
// /weekly (existing)
// --------------------------------------------------
router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT week_start, week_end, source, positive, negative, neutral, top_entities
      FROM news_weekly_summary
      ORDER BY week_start DESC, source ASC
      LIMIT 200
    `);

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
