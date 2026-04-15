// src/routes/processRoute.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const analyze = require("../services/analyzeService");
const { upsertEntity } = require("../lib/entities/upsertEntity");

// Insert a new post
router.post("/post", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const result = await db.pool.query(
      `INSERT INTO posts (content, tenant_id)
       VALUES ($1, $2)
       RETURNING id, content, tenant_id`,
      [content, req.user.tenant_id]
    );

    return res.json({ ok: true, post: result.rows[0] });
  } catch (err) {
    console.error("Post insert error:", err);
    return res.status(500).json({ error: "Failed to insert post" });
  }
});

// Process unprocessed posts
router.post("/run", async (req, res) => {
  try {
    const posts = await db.getUnprocessedPosts(req.user.tenant_id);

    let processed = 0;

    for (const post of posts) {
      const analysis = await analyze(post.content);

      // 1. Sentiment
      await db.insertSentimentResult(
        post.id,
        analysis.sentiment,
        req.user.tenant_id
      );

      // 2. Topics
      await db.insertPostTopics(
        post.id,
        analysis.topics,
        req.user.tenant_id
      );

      // 3. ENTITY DETECTION + UPSERT + LINK
      if (analysis.entity) {
        const entityId = await upsertEntity(analysis.entity);
        if (entityId) {
          await db.updatePostEntity(post.id, entityId);
        }
      }

      processed++;
    }

    return res.json({ ok: true, processed });
  } catch (err) {
    console.error("Processing error:", err);
    return res.status(500).json({ error: "Processing failed" });
  }
});

module.exports = router;
