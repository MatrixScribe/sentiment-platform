// src/routes/redditIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
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

      // 1. Insert post
      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, created_at`,
        [p.id, "reddit", content, tenantId]
      );

      const post = insert.rows[0];

      // 2. Sentiment
      const sentiment = analyzeSentiment(content);
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      // 3. Topics
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
