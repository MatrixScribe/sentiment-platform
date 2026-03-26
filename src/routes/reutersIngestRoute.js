// src/routes/reutersIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const RSSParser = require('rss-parser');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');

// IMPORTANT: Reuters feed now goes through Fly.io proxy
const FLY_PROXY_REUTERS =
  "https://matrix-proxy.fly.dev/proxy?url=https%3A%2F%2Fwww.reuters.com%2FrssFeed%2FtopNews";

const parser = new RSSParser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Connection: "keep-alive",
  },
});

router.post('/reuters', async (req, res) => {
  try {
    // Always use Fly.io proxy unless user overrides
    const feed = req.body.feed || FLY_PROXY_REUTERS;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("Reuters");
    const sourceWeight = await getSourceWeight(sourceId);

    // Fetch RSS feed through Fly.io
    const feedData = await parser.parseURL(feed);

    const results = [];

    for (const item of feedData.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content, created_at`,
        [item.link, "reuters", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      let sentiment = analyzeSentiment(content);
      sentiment = sentiment * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      results.push({
        id: post.id,
        external_id: item.link,
        sentiment,
        topics,
      });
    }

    res.json({
      ok: true,
      feed,
      ingested: results.length,
      posts: results,
    });
  } catch (err) {
    console.error("Reuters ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest Reuters feed" });
  }
});

module.exports = router;
