// src/routes/analyticsRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ---------------- SENTIMENT SUMMARY ----------------
router.get('/sentiment/summary', async (req, res) => {
  try {
    const summary = await db.getSentimentSummary(req.user.tenant_id);

    res.json({
      ok: true,
      summary: {
        total_posts: Number(summary.total),
        positive: Number(summary.positive),
        negative: Number(summary.negative),
        neutral: Number(summary.neutral),
        average_score: Number(summary.average_score)
      }
    });

  } catch (err) {
    console.error("Sentiment summary error:", err);
    res.status(500).json({ error: "Failed to fetch sentiment summary" });
  }
});

// ---------------- TRENDING TOPICS ----------------
router.get('/topics/trending', async (req, res) => {
  try {
    const rows = await db.getTrendingTopics(req.user.tenant_id);

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    const topics = rows.map(r => ({
      topic: r.topic,
      count: Number(r.count),
      percentage: total > 0 ? Number(((r.count / total) * 100).toFixed(2)) : 0
    }));

    res.json({
      ok: true,
      total_posts_with_topics: total,
      topics
    });

  } catch (err) {
    console.error("Trending topics error:", err);
    res.status(500).json({ error: "Failed to fetch trending topics" });
  }
});

// ---------------- SENTIMENT BY TOPIC ----------------
router.get('/sentiment/by-topic', async (req, res) => {
  try {
    const rows = await db.getSentimentByTopic(req.user.tenant_id);

    const grouped = {};

    for (const row of rows) {
      const topic = row.topic;

      if (!grouped[topic]) {
        grouped[topic] = {
          topic,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0
        };
      }

      grouped[topic][row.sentiment] += Number(row.count);
      grouped[topic].total += Number(row.count);
    }

    res.json({
      ok: true,
      topics: Object.values(grouped)
    });

  } catch (err) {
    console.error("Sentiment by topic error:", err);
    res.status(500).json({ error: "Failed to fetch sentiment by topic" });
  }
});

// ---------------- POST DETAILS ----------------
router.get('/posts/:id/details', async (req, res) => {
  try {
    const postId = req.params.id;
    const details = await db.getPostDetails(postId, req.user.tenant_id);

    if (!details) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      ok: true,
      post_id: postId,
      content: details.post.content,
      sentiment: details.sentiment,
      topics: details.topics,
      created_at: details.post.created_at || null
    });

  } catch (err) {
    console.error("Post details error:", err);
    res.status(500).json({ error: "Failed to fetch post details" });
  }
});

module.exports = router;
