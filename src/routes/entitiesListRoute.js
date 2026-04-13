// src/routes/entitiesListRoute.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// Utility: safe numeric
const safeNum = (x) => (typeof x === "number" && !isNaN(x) ? x : 0);

// ---------------------------------------------------------
// GET /api/entities
// Full intelligence bundle for ALL entities
// ---------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    // 1) Load all entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, region, description, normalized_name,
             created_at, updated_at
      FROM entities
      ORDER BY updated_at DESC
    `);

    const entities = entitiesResult.rows;
    if (entities.length === 0) {
      return res.json([]);
    }

    const ids = entities.map((e) => e.id);

    // -----------------------------------------------------
    // 2) Volume (24h + 7d)
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
    // 3) Sentiment (avg, 7d, 30d)
    // -----------------------------------------------------
    const sentimentResult = await pool.query(
      `
      SELECT p.entity_id,
             AVG(s.score) AS avg_score,
             AVG(s.score) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days') AS avg_7d,
             AVG(s.score) FILTER (WHERE p.created_at > NOW() - INTERVAL '30 days') AS avg_30d
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = ANY($1)
      GROUP BY p.entity_id
      `,
      [ids]
    );

    const sentimentMap = {};
    for (const row of sentimentResult.rows) {
      sentimentMap[row.entity_id] = {
        avg: safeNum(Number(row.avg_score)),
        avg_7d: safeNum(Number(row.avg_7d)),
        avg_30d: safeNum(Number(row.avg_30d)),
      };
    }

    // -----------------------------------------------------
    // 4) Publisher diversity
    // -----------------------------------------------------
    const publisherResult = await pool.query(
      `
      SELECT entity_id, source, COUNT(*) AS count
      FROM posts
      WHERE entity_id = ANY($1)
      GROUP BY entity_id, source
      `,
      [ids]
    );

    const publisherMap = {};
    for (const row of publisherResult.rows) {
      if (!publisherMap[row.entity_id]) publisherMap[row.entity_id] = {};
      publisherMap[row.entity_id][row.source] = Number(row.count);
    }

    const diversityMap = {};
    for (const id of ids) {
      const sources = publisherMap[id] || {};
      const total = Object.values(sources).reduce((a, b) => a + b, 0);
      const unique = Object.keys(sources).length;
      diversityMap[id] = total > 0 ? unique / total : 0;
    }

    // -----------------------------------------------------
    // 5) Related entities (co‑mentions)
    // -----------------------------------------------------
    const relatedResult = await pool.query(
      `
      SELECT p.entity_id AS base,
             e2.id AS related_id,
             e2.name AS related_name,
             e2.slug AS related_slug,
             COUNT(*) AS count
      FROM posts p
      JOIN posts p2 ON p2.content_hash = p.content_hash
      JOIN entities e2 ON e2.id = p2.entity_id
      WHERE p.entity_id = ANY($1)
        AND p2.entity_id <> p.entity_id
      GROUP BY base, related_id, related_name, related_slug
      ORDER BY count DESC
      `,
      [ids]
    );

    const relatedMap = {};
    for (const row of relatedResult.rows) {
      if (!relatedMap[row.base]) relatedMap[row.base] = [];
      relatedMap[row.base].push({
        id: row.related_id,
        name: row.related_name,
        slug: row.related_slug,
        count: Number(row.count),
      });
    }

    // -----------------------------------------------------
    // 6) Topics (top 5)
    // -----------------------------------------------------
    const topicsResult = await pool.query(
      `
      SELECT p.entity_id,
             t.name,
             COUNT(*) AS count
      FROM post_topics pt
      JOIN topics t ON t.id = pt.topic_id
      JOIN posts p ON p.id = pt.post_id
      WHERE p.entity_id = ANY($1)
      GROUP BY p.entity_id, t.name
      ORDER BY count DESC
      `,
      [ids]
    );

    const topicsMap = {};
    for (const row of topicsResult.rows) {
      if (!topicsMap[row.entity_id]) topicsMap[row.entity_id] = [];
      topicsMap[row.entity_id].push({
        name: row.name,
        count: Number(row.count),
      });
    }

    // -----------------------------------------------------
    // 7) Narrative volatility (stddev of sentiment)
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
    // 8) Last seen
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
    // 9) Assemble final response
    // -----------------------------------------------------
    const enriched = entities.map((e) => {
      const id = e.id;

      return {
        ...e,
        sentiment: sentimentMap[id] || { avg: 0, avg_7d: 0, avg_30d: 0 },
        volume: volumeMap[id] || { vol_24h: 0, vol_7d: 0 },
        velocity:
          volumeMap[id]?.vol_24h && volumeMap[id]?.vol_7d
            ? volumeMap[id].vol_24h / (volumeMap[id].vol_7d / 7)
            : 0,
        publisher_diversity: diversityMap[id] || 0,
        topics: (topicsMap[id] || []).slice(0, 5),
        related: relatedMap[id] || [],
        volatility: volatilityMap[id] || 0,
        last_seen: lastSeenMap[id] || null,
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error("❌ /api/entities error:", err);
    return res.status(500).json({ error: "Failed to load entities" });
  }
});

module.exports = router;
