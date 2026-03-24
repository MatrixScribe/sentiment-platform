// src/routes/redditIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const fetch = require('node-fetch');

// ---------------- REDDIT INGESTION ----------------
router.post('/reddit', async (req, res) => {
  try {
    const { subreddit = "southafrica", limit = 5 } = req.body;
    const tenantId = req.user.tenant_id;

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

      // 1. Insert post with hash dedupe
      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content, created_at`,
        [p.id, "reddit", content, contentHash, tenantId]
      );

      // If duplicate, skip sentiment + topics + clustering
      if (insert.rows.length === 0) {
        continue;
      }

      const post = insert.rows[0];

      // 2. Assign to a story cluster (Step 4C)
      await findOrCreateClusterForPost(post.id, content, tenantId);

      // 3. Sentiment
      const sentiment = analyzeSentiment(content);
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      // 4. Topics
      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

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
