// src/routes/newsIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const fetch = require('node-fetch');

// ---------------- NEWS INGESTION ----------------
router.post('/news', async (req, res) => {
  try {
    const { query = "south africa", limit = 5 } = req.body;
    const tenantId = req.user.tenant_id;

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=demo`;

    const response = await fetch(url, {
      headers: { "User-Agent": "MatrixScribeBot/1.0" }
    });

    const data = await response.json();

    if (!data.articles) {
      console.error("News API returned unexpected structure:", data);
      return res.status(400).json({ error: "Invalid query or no news returned" });
    }

    const results = [];

    for (const article of data.articles) {
      const content = `${article.title}\n\n${article.description || ""}\n\n${article.content || ""}`;

      // 1. Insert post
      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, created_at`,
        [article.url, "news", content, tenantId]
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
        external_id: article.url,
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
