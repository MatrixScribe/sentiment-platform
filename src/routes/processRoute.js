// src/routes/processRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyze = require('../services/analyzeService'); // your AI logic

// Insert a new post
router.post('/post', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Insert post with tenant_id
    const result = await db.pool.query(
      `INSERT INTO posts (content, tenant_id)
       VALUES ($1, $2)
       RETURNING id, content, tenant_id`,
      [content, req.user.tenant_id]
    );

    const post = result.rows[0];

    res.json({
      ok: true,
      post
    });

  } catch (err) {
    console.error("Post insert error:", err);
    res.status(500).json({ error: "Failed to insert post" });
  }
});

// Process unprocessed posts
router.post('/run', async (req, res) => {
  try {
    const posts = await db.getUnprocessedPosts(req.user.tenant_id);

    for (const post of posts) {
      const analysis = await analyze(post.content);

      await db.insertSentimentResult(post.id, analysis.sentiment, req.user.tenant_id);
      await db.insertPostTopics(post.id, analysis.topics, req.user.tenant_id);
    }

    res.json({ ok: true, processed: posts.length });

  } catch (err) {
    console.error("Processing error:", err);
    res.status(500).json({ error: "Processing failed" });
  }
});

module.exports = router;
