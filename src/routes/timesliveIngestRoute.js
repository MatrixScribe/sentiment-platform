// src/routes/timesliveIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const RSSParser = require('rss-parser');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');

// Fly.io proxy URL for TimesLIVE
const FLY_PROXY_TIMESLIVE =
  "https://matrix-proxy.fly.dev/proxy?url=https%3A%2F%2Fwww.timeslive.co.za%2Frss%2F";

const parser = new RSSParser({
  requestOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/rss+xml, application/xml, text/xml"
    },
    redirect: "follow",
    compress: false
  }
});

router.post('/timeslive', async (req, res) => {
  try {
    // Always use Fly.io proxy unless overridden
    const feed = req.body.feed || FLY_PROXY_TIMESLIVE;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("TimesLIVE");
    const sourceWeight = await getSourceWeight(sourceId);

    const feedData = await parser.parseURL(feed);
    const results = [];

    for (const item of feedData.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_post_source DO NOTHING
         RETURNING id, content`,
        [item.link, "timeslive", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];
      await findOrCreateClusterForPost(post.id, content, tenantId);

      let sentiment = analyzeSentiment(content) * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      results.push({
        id: post.id,
        external_id: item.link,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      feed,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("TimesLIVE ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest TimesLIVE feed" });
  }
});

module.exports = router;
