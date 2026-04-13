// src/routes/narrativeShiftInsights.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// --------------------------------------------------
// ROOT HANDLER — /api/insights/narrative
// --------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const entity = await pool.query(`
      SELECT *
      FROM entity_summary
      ORDER BY volume_24h DESC
      LIMIT 1
    `);

    const signals = await pool.query(`
      SELECT *
      FROM narrative_signals
      ORDER BY date DESC
      LIMIT 50
    `);

    res.json({
      entity: entity.rows[0] || null,
      signals: signals.rows
    });
  } catch (err) {
    console.error("narrativeShiftInsights / root error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// /recent (existing)
// --------------------------------------------------
router.get("/recent", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM narrative_signals
      ORDER BY date DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("narrativeShiftInsights /recent error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------
// /by-topic/:topic (existing)
// --------------------------------------------------
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
