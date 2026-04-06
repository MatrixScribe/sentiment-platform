// src/routes/narrativeShiftInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/narratives/shifts/recent
router.get("/recent", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM narrative_signals
      ORDER BY date DESC
      LIMIT 100
      `
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("narrativeShiftInsights /recent error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/narratives/shifts/by-topic/:topic
router.get("/by-topic/:topic", async (req, res) => {
  const { topic } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM narrative_signals
      WHERE topic = $1
      ORDER BY date ASC
      `,
      [topic]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("narrativeShiftInsights /by-topic error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
