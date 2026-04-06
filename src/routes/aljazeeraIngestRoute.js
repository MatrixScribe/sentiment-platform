// src/routes/aljazeeraIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const RSSParser = require('rss-parser');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');
const analyze = require("../services/analyzeService");

const parser = new RSSParser({
  requestOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/rss+xml, application/xml, text/xml",
      "Connection": "keep-alive"
    },
    redirect: "follow",
    compress: false
  }
});

router.post('/aljazeera', async (req, res) => {
  try {
    const feed = "https://www.aljazeera.com/xml/rss/all.xml";
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("Al Jazeera");
    const sourceWeight = await getSourceWeight(sourceId);

    const feedData = await parser.parseURL(feed);
    const results = [];

    for (const item of feedData.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_post_source DO NOTHING
         RETURNING id, content`,
        [item.link, "aljazeera", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      // unified analysis
      const analysis = await analyze(content);

      if (analysis.entity) {
        await db.pool.query(
          `UPDATE posts
           SET entity_id = $1,
               entity_type = $2,
               entity_confidence = $3
           WHERE id = $4`,
          [
            analysis.entity.id || null,
            analysis.entityType || null,
            analysis.confidence || null,
            post.id
          ]
        );
      }

      // existing sentiment logic (weighted)
      let sentiment = analyzeSentiment(content) * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      // existing topics logic
      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      // tags
      if (Array.isArray(analysis.tags) && analysis.tags.length > 0) {
        for (const tag of analysis.tags) {
          await db.pool.query(
            `INSERT INTO post_tags (post_id, tag, tenant_id)
             VALUES ($1, $2, $3)`,
            [post.id, tag, tenantId]
          );
        }
      }

      results.push({ id: post.id, external_id: item.link, sentiment, topics });
    }

    res.json({ ok: true, ingested: results.length, posts: results });

  } catch (err) {
    console.error("Al Jazeera ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest Al Jazeera feed" });
  }
});

module.exports = router;
