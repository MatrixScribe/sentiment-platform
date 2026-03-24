// src/routes/newsIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const fetch = require('node-fetch');

router.post('/news', async (req, res) => {
  try {
    const { query = "south africa", limit = 5 } = req.body;
    const tenantId = req.user.tenant_id;

    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&language=en&country=za&size=${limit}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "MatrixScribeBot/1.0" }
    });

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      console.error("News API returned unexpected structure:", data);
      return res.status(400).json({
        error: "Invalid query or no news returned",
        details: data
      });
    }

    const results = [];

    for (const article of data.results) {
      const content = `${article.title}\n\n${article.description || ""}\n\n${article.content || ""}`;
      const contentHash = hashContent(content);

      // 1. Insert post with hash dedupe
      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content, created_at`,
        [article.link, "news", content, contentHash, tenantId]
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
        external_id: article.link,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      query,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("News ingestion error:", err.message);
    res.status(500).json({ error: "Failed to ingest news", details: err.message });
  }
});

module.exports = router;
