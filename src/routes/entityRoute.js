// src/routes/entityRoute.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// Utility: normalize sentiment score (-1 to 1 → 0 to 100)
function normalize(score) {
  if (score === null || score === undefined) return 50;
  return Math.round(((score + 1) / 2) * 100);
}

// Utility: compute velocity % change
function pctChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// GET /api/entity/:slug
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. ENTITY METADATA
    const entityResult = await pool.query(
      `
      SELECT *
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

    // 2. POSTS (latest 50)
    const postsResult = await pool.query(
      `
      SELECT id, content, source, created_at
      FROM posts
      WHERE entity_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [entityId]
    );

    // 3. SENTIMENT DISTRIBUTION + AVG SCORE
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

    // Compute normalized sentiment score
    const allScores = await pool.query(
      `
      SELECT AVG(s.score) AS avg_score
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = $1
      `,
      [entityId]
    );
    const sentimentScore = normalize(allScores.rows[0]?.avg_score || 0);

    // 4. SENTIMENT TIMELINE
    const timelineResult = await pool.query(
      `
      SELECT
        DATE(p.created_at) AS date,
        COUNT(*) AS volume,
        AVG(s.score) AS avg_score
      FROM sentiment_scores s
      JOIN posts p ON p.id = s.post_id
      WHERE p.entity_id = $1
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at) ASC
      `,
      [entityId]
    );

    // 5. TOPICS
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

    // 6. TAGS
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

    // 7. PUBLISHERS (source)
    const publishersResult = await pool.query(
      `
      SELECT p.source AS publisher,
             COUNT(*) AS count,
             AVG(s.score) AS avg_score
      FROM posts p
      JOIN sentiment_scores s ON s.post_id = p.id
      WHERE p.entity_id = $1
      GROUP BY p.source
      ORDER BY count DESC
      LIMIT 20
      `,
      [entityId]
    );

    // 8. VELOCITY (24h, 7d, 30d)
    const velocityResult = await pool.query(
      `
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS volume
      FROM posts
      WHERE entity_id = $1
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 30
      `,
      [entityId]
    );

    const volumes = velocityResult.rows.map(r => Number(r.volume));
    const v24 = volumes[0] || 0;
    const v48 = volumes[1] || 0;
    const v7 = volumes.slice(0, 7).reduce((a, b) => a + b, 0);
    const v14 = volumes.slice(7, 14).reduce((a, b) => a + b, 0);
    const v30 = volumes.slice(0, 30).reduce((a, b) => a + b, 0);

    const velocity = {
      v24h: pctChange(v24, v48),
      v7d: pctChange(v7, v14),
      v30d: v30
    };

    // 9. RELATED ENTITIES
    const relatedResult = await pool.query(
      `
      SELECT e2.id, e2.name, e2.slug, COUNT(*) AS count
      FROM posts p
      JOIN posts p2 ON p2.cluster_id = p.cluster_id
      JOIN entities e2 ON e2.id = p2.entity_id
      WHERE p.entity_id = $1
        AND e2.id <> $1
      GROUP BY e2.id, e2.name, e2.slug
      ORDER BY count DESC
      LIMIT 10
      `,
      [entityId]
    );

    // 10. INSIGHTS
    const insightResult = await pool.query(
      `
      SELECT date, topics, sentiment_trend, summary
      FROM insights
      WHERE tenant_id = 'global'
      ORDER BY date DESC
      LIMIT 10
      `
    );

    // 11. RISK SCORE (simple version)
    const riskScore = Math.round((100 - sentimentScore + velocity.v24h) / 2);

    // 12. Alerts (simple placeholder)
    const alerts = [
      riskScore > 60 ? { type: "risk", message: "Sentiment deterioration detected" } : null,
      velocity.v24h > 50 ? { type: "velocity", message: "High posting velocity spike" } : null
    ].filter(Boolean);

    // 13. Narrative summary placeholder
    const narrative = {
      summary: "Narrative summary will be generated by AI.",
      themes: ["sentiment", "topics", "publishers"]
    };

    return res.json({
      entity,
      sentiment: {
        distribution: sentimentResult.rows,
        score: sentimentScore
      },
      timeline: timelineResult.rows,
      velocity,
      publishers: publishersResult.rows,
      topics: topicsResult.rows,
      tags: tagsResult.rows,
      related: relatedResult.rows,
      risk: {
        score: riskScore,
        sentiment: sentimentResult.rows
      },
      alerts,
      narrative,
      insights: insightResult.rows,
      articles: postsResult.rows
    });

  } catch (err) {
    console.error("Entity route error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
