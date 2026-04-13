// src/routes/newsInsightsUnified.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// --------------------------------------------------
// ROOT HANDLER — /api/insights/news
// --------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const timeline = await pool.query(`
      SELECT date, avg_score AS value
      FROM sentiment_timeline
      ORDER BY date ASC
      LIMIT 200
    `);

    const articles = await pool.query(`
      SELECT id, content, source, created_at, external_id AS url
      FROM articles
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const entities = await pool.query(`
      SELECT id, name, slug, sentiment_avg AS sentiment,
             volume_24h AS volume, velocity
      FROM entity_summary
      ORDER BY volume_24h DESC
      LIMIT 10
    `);

    res.json({
      timeline: timeline.rows,
      top_articles: articles.rows,
      top_entities: entities.rows
    });
  } catch (err) {
    console.error("newsInsightsUnified / root error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// /overview (existing)
// --------------------------------------------------
router.get("/overview", async (req, res) => {
  try {
    const daily = await pool.query(`
      SELECT *
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 100
    `);

    const weekly = await pool.query(`
      SELECT *
      FROM news_weekly_summary
      ORDER BY week_start DESC, source ASC
      LIMIT 50
    `);

    const insights = await pool.query(`
      SELECT *
      FROM insights
      WHERE tenant_id = 'global'
      ORDER BY date DESC
      LIMIT 30
    `);

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

// --------------------------------------------------
// /narratives (existing)
// --------------------------------------------------
router.get("/narratives", async (req, res) => {
  try {
    const signals = await pool.query(`
      SELECT *
      FROM narrative_signals
      ORDER BY date DESC
      LIMIT 100
    `);

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
