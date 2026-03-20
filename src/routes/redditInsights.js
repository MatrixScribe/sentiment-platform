// src/routes/redditInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const {
  sentimentTrendTransform,
  topEntitiesTransform,
  subredditComparisonTransform,
  dailySummaryTransform
} = require("../utils/redditTransformers");

// ---------------- DAILY SUMMARY (Dashboard-ready) ----------------
router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM reddit_daily_summary
      ORDER BY date DESC, subreddit ASC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: dailySummaryTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- WEEKLY SUMMARY (Raw) ----------------
router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM reddit_weekly_summary
      ORDER BY week_start DESC, subreddit ASC
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

// ---------------- SENTIMENT TREND (Line Chart) ----------------
router.get("/sentiment-trend/:subreddit", async (req, res) => {
  const { subreddit } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT date, positive, negative, neutral
      FROM reddit_daily_summary
      WHERE subreddit = $1
      ORDER BY date ASC
      `,
      [subreddit]
    );

    res.json({
      success: true,
      data: sentimentTrendTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- TOP ENTITIES (Word Cloud / Bar Chart) ----------------
router.get("/top-entities/:subreddit", async (req, res) => {
  const { subreddit } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT date, top_entities
      FROM reddit_daily_summary
      WHERE subreddit = $1
      ORDER BY date DESC
      LIMIT 7
      `,
      [subreddit]
    );

    res.json({
      success: true,
      data: topEntitiesTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- SUBREDDIT COMPARISON (Stacked Bar) ----------------
router.get("/compare", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date, subreddit, positive, negative, neutral
      FROM reddit_daily_summary
      ORDER BY date DESC, subreddit ASC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: subredditComparisonTransform(result.rows)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
