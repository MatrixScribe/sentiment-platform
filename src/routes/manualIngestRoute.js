// src/routes/manualIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment'); 
const extractTopics = require('../utils/topics');      

// ---------------- MANUAL INGESTION ----------------
router.post('/manual', async (req, res) => {
  try {
    const { content, source = "manual" } = req.body;
    const tenantId = req.user.tenant_id;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // 1. Insert post
    const postInsert = await db.pool.query(
      `INSERT INTO posts (content, source, tenant_id)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [content, source, tenantId]
    );

    const post = postInsert.rows[0];

    // 2. Run sentiment analysis
    const sentiment = await analyzeSentiment(content);

    await db.insertSentimentResult(post.id, sentiment, tenantId);

    // 3. Extract topics
    const topics = extractTopics(content);

    await db.insertPostTopics(post.id, topics, tenantId);

    // 4. Return full processed object
    res.json({
      ok: true,
      post: {
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        sentiment,
        topics
      }
    });

  } catch (err) {
    console.error("Manual ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest post manually" });
  }
});

module.exports = router;
