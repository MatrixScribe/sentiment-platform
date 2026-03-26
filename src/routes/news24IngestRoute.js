// src/routes/news24IngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const RSSParser = require('rss-parser');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');

const parser = new RSSParser({
  defaultRSS: 2.0,
  headers: { "User-Agent": "Mozilla/5.0" }
});

// Google News RSS for News24
const GOOGLE_NEWS24 =
  "https://news.google.com/rss/search?q=site:news24.com&hl=en-ZA&gl=ZA&ceid=ZA:en";

router.post('/news24', async (req, res) => {
  try {
    const feedUrl = req.body.feed || GOOGLE_NEWS24;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("News24");
    const sourceWeight = await getSourceWeight(sourceId);

    const feed = await parser.parseURL(feedUrl);

    const results = [];

    for (const item of feed.items || []) {
      const title = item.title || "";
      const link = item.link || "";
      const summary = item.contentSnippet || "";

      const content = `${title}\n\n${summary}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_post_source DO NOTHING
         RETURNING id, content`,
        [link, "news24", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      const sentiment = analyzeSentiment(content) * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      results.push({
        id: post.id,
        external_id: link,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      feed: feedUrl,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("News24 ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest News24 (Google News RSS)" });
  }
});

module.exports = router;
