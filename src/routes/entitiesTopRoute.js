// src/routes/entitiesTopRoute.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

const safeNum = (x) => (typeof x === "number" && !isNaN(x) ? x : 0);

// ---------------------------------------------------------
// GET /api/entities/top
// Returns top entities ranked by:
// - volume (24h)
// - sentiment (avg)
// - velocity
// - volatility
// ---------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    // 1) Load all entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug
      FROM entities
    `);

    const entities = entitiesResult.rows;
    if (entities.length === 0) return res.json([]);

    const ids = entities.map((e) => e.id);

    // -----------------------------------------------------
    // Volume (24h + 7d)
    // -----------------------------------------------------
    const volumeResult = await pool.query(
      `
      SELECT entity_id,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS vol_24h,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS vol_7d
      FROM posts
      WHERE entity_id = ANY($1)
      GROUP BY entity_id
      `,
      [ids]
    );

    const volumeMap = {};
    for (const row of volumeResult.rows) {
      volumeMap[row.entity_id] = {
        vol_24h: Number(row.vol_24h),
        vol_7d: Number(row.vol_7d),
      };
    }

    // -----------------------------------------------------
    // Sentiment (avg)
    // -----------------------------------------------------
    const sentimentResult = await pool.query(
      `
      SELECT p.entity_id,
             AVG(s.score) AS avg_score
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = ANY($1)
      GROUP BY p.entity_id
      `,
      [ids]
    );

    const sentimentMap = {};
    for (const row of sentimentResult.rows) {
      sentimentMap[row.entity_id] = safeNum(Number(row.avg_score));
    }

    // -----------------------------------------------------
    // Volatility (stddev)
    // -----------------------------------------------------
    const volatilityResult = await pool.query(
      `
      SELECT p.entity_id,
             STDDEV(s.score) AS volatility
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = ANY($1)
      GROUP BY p.entity_id
      `,
      [ids]
    );

    const volatilityMap = {};
    for (const row of volatilityResult.rows) {
      volatilityMap[row.entity_id] = safeNum(Number(row.volatility));
    }

    // -----------------------------------------------------
    // Last seen
    // -----------------------------------------------------
    const lastSeenResult = await pool.query(
      `
      SELECT entity_id, MAX(created_at) AS last_seen
      FROM posts
      WHERE entity_id = ANY($1)
      GROUP BY entity_id
      `,
      [ids]
    );

    const lastSeenMap = {};
    for (const row of lastSeenResult.rows) {
      lastSeenMap[row.entity_id] = row.last_seen;
    }

    // -----------------------------------------------------
    // Build enriched list
    // -----------------------------------------------------
    const enriched = entities.map((e) => {
      const id = e.id;
      const vol = volumeMap[id] || { vol_24h: 0, vol_7d: 0 };

      return {
        ...e,
        volume: vol,
        sentiment: sentimentMap[id] || 0,
        velocity:
          vol.vol_24h && vol.vol_7d
            ? vol.vol_24h / (vol.vol_7d / 7)
            : 0,
        volatility: volatilityMap[id] || 0,
        last_seen: lastSeenMap[id] || null,
      };
    });

    // -----------------------------------------------------
    // Sort by volume (24h) DESC
    // -----------------------------------------------------
    enriched.sort((a, b) => b.volume.vol_24h - a.volume.vol_24h);

    return res.json(enriched);
  } catch (err) {
    console.error("❌ /api/entities/top error:", err);
    return res.status(500).json({ error: "Failed to load top entities" });
  }
});

module.exports = router;
