// src/routes/redditIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');
const fetch = require('node-fetch');
const analyze = require("../services/analyzeService");

router.post('/reddit', async (req, res) => {
  try {
    const { subreddit = "southafrica", limit = 5 } = req.body;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("Reddit");
    const sourceWeight = await getSourceWeight(sourceId);

    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || !data.data.children) {
      return res.status(400).json({ error: "Invalid subreddit or no data returned" });
    }

    const posts = data.data.children.map(p => p.data);
    const results = [];

    for (const p of posts) {
      const content = p.title + "\n\n" + (p.selftext || "");
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content, created_at`,
        [p.id, "reddit", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) {
        continue;
      }

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
      let sentiment = analyzeSentiment(content);
      sentiment = sentiment * sourceWeight; // ⭐ apply weighting
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

      results.push({
        id: post.id,
        external_id: p.id,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      subreddit,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("Reddit ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest from Reddit" });
  }
});

module.exports = router;
