// src/routes/entityRoute.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/entity/:slug
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // 1) Core entity
    const entityResult = await pool.query(
      `
      SELECT id, name, slug, type, region, description, normalized_name, created_at, updated_at
      FROM entities
      WHERE slug = $1
      `,
      [slug]
    );

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: "Entity not found" });
    }

    const entity = entityResult.rows[0];
    const entityId = entity.id;

    // 2) Recent posts for this entity
    const postsResult = await pool.query(
      `
      SELECT p.id, p.content, p.source, p.created_at
      FROM posts p
      WHERE p.entity_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
      `,
      [entityId]
    );

    // 3) Sentiment breakdown
    const sentimentResult = await pool.query(
      `
      SELECT s.sentiment, COUNT(*) AS count, AVG(s.score) AS avg_score
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = $1
      GROUP BY s.sentiment
      `,
      [entityId]
    );

    // 4) Sentiment timeline (daily)
    const sentimentTimelineResult = await pool.query(
      `
      SELECT
        DATE(p.created_at) AS date,
        AVG(s.score) AS avg_score
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = $1
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at) ASC
      `,
      [entityId]
    );

    // 5) Top topics for this entity
    const topicsResult = await pool.query(
      `
      SELECT t.name, COUNT(*) AS count
      FROM post_topics pt
      JOIN topics t ON t.id = pt.topic_id
      JOIN posts p ON p.id = pt.post_id
      WHERE p.entity_id = $1
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 20
      `,
      [entityId]
    );

    // 6) Top tags for this entity
    const tagsResult = await pool.query(
      `
      SELECT pt.tag, COUNT(*) AS count
      FROM post_tags pt
      JOIN posts p ON p.id = pt.post_id
      WHERE p.entity_id = $1
      GROUP BY pt.tag
      ORDER BY count DESC
      LIMIT 20
      `,
      [entityId]
    );

    // 7) Related entities (co‑mentioned in same posts)
    const relatedResult = await pool.query(
      `
      SELECT e2.id, e2.name, e2.slug, COUNT(*) AS count
      FROM posts p
      JOIN posts p2 ON p2.id = p.id AND p2.entity_id IS NOT NULL
      JOIN entities e2 ON e2.id = p2.entity_id
      WHERE p.entity_id = $1
        AND e2.id <> $1
      GROUP BY e2.id, e2.name, e2.slug
      ORDER BY count DESC
      LIMIT 10
      `,
      [entityId]
    );

    // 8) Narrative / insight summary (if any)
    const insightResult = await pool.query(
      `
      SELECT date, topics, sentiment_trend, summary
      FROM insights
      WHERE tenant_id = 'global'
      ORDER BY date DESC
      LIMIT 10
      `
    );

    return res.json({
      entity,
      timeline: sentimentTimelineResult.rows,
      articles: postsResult.rows,
      publishers: [], // can be derived later from posts.source
      topics: topicsResult.rows,
      tags: tagsResult.rows,
      related: relatedResult.rows,
      forecast: [],   // placeholder for future model
      alerts: [],     // can be wired to narrative_alerts later
      events: [],     // placeholder
      risk: {
        sentiment: sentimentResult.rows,
      },
      comparison: [],
      insights: insightResult.rows
    });
  } catch (err) {
    console.error("Entity route error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
