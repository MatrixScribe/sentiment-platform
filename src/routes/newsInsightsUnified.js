// src/routes/newsInsightsUnified.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const {
  newsSentimentTrendTransform,
  newsTopEntitiesTransform,
  newsSourceComparisonTransform,
  newsDailySummaryTransform
} = require("../utils/newsTransformers");

// ------------------------------------------------------
// UNIFIED NEWS INSIGHTS ENDPOINT
// ------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    // 1. Latest 24h summary (global sentiment)
    const dailyResult = await pool.query(`
      SELECT *
      FROM news_daily_summary
      ORDER BY date DESC
      LIMIT 20
    `);

    const dailyTransformed = newsDailySummaryTransform(dailyResult.rows);

    // 2. Rising topics (top entities from latest day)
    const risingResult = await pool.query(`
      SELECT top_entities
      FROM news_daily_summary
      ORDER BY date DESC
      LIMIT 1
    `);

    const risingTopics = risingResult.rows.length
      ? newsTopEntitiesTransform(risingResult.rows)
      : [];

    // 3. Source comparison
    const compareResult = await pool.query(`
      SELECT date, source, positive, negative, neutral
      FROM news_daily_summary
      ORDER BY date DESC, source ASC
      LIMIT 100
    `);

    const sourceComparison = newsSourceComparisonTransform(compareResult.rows);

    // 4. Trend (aggregate across all sources)
    const trendResult = await pool.query(`
      SELECT date,
             SUM(positive) AS positive,
             SUM(negative) AS negative,
             SUM(neutral) AS neutral
      FROM news_daily_summary
      GROUP BY date
      ORDER BY date ASC
      LIMIT 60
    `);

    const trend = newsSentimentTrendTransform(trendResult.rows);

    // ------------------------------------------------------
    // FINAL RESPONSE
    // ------------------------------------------------------
    res.json({
      success: true,
      global_sentiment: dailyTransformed,
      rising_topics: risingTopics,
      source_comparison: sourceComparison,
      trend: trend
    });

  } catch (err) {
    console.error("Unified News Insights Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
