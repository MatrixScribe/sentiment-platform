// src/routes/entitiesSearchRoute.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// ---------------------------------------------------------
// GET /api/entities/search?q=term
// ---------------------------------------------------------
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase().trim();

    if (!q) return res.json([]);

    const result = await pool.query(
      `
      SELECT id, name, slug, description
      FROM entities
      WHERE LOWER(name) LIKE $1
         OR LOWER(slug) LIKE $1
         OR LOWER(normalized_name) LIKE $1
      ORDER BY name ASC
      LIMIT 20
      `,
      [`%${q}%`]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("❌ /api/entities/search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
