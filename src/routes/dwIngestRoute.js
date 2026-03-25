// src/routes/dwIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const RSSParser = require('rss-parser');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');

const parser = new RSSParser();

router.post('/dw', async (req, res) => {
  try {
    const { feed = "https://rss.dw.com/rdf/rss-en-top" } = req.body;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("DW");
    const sourceWeight = await getSourceWeight(sourceId);

    const feedData = await parser.parseURL(feed);
    const results = [];

    for (const item of feedData.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content`,
        [item.link, "dw", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      let sentiment = analyzeSentiment(content) * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      results.push({ id: post.id, external_id: item.link, sentiment, topics });
    }

    res.json({ ok: true, feed, ingested: results.length, posts: results });

  } catch (err) {
    console.error("DW ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest DW feed" });
  }
});

module.exports = router;
