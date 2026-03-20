// src/routes/narrativeAlerts.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// ---------------- LIST RECENT ALERTS ----------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM narrative_alerts
      ORDER BY date DESC, created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ---------------- RESOLVE AN ALERT ----------------
router.post("/:id/resolve", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE narrative_alerts
      SET resolved = TRUE
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
