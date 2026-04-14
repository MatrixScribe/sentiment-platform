// src/routes/reutersIngestRoute.js
const express = require("express");
const router = express.Router();
const Parser = require("rss-parser");
const parser = new Parser();

const db = require("../db");
const analyzeSentiment = require("../utils/sentiment");
const extractTopics = require("../utils/topics");
const hashContent = require("../utils/hash");

const { findOrCreateClusterForPost } = require("../utils/storyClustering");
const { getSourceId, getSourceWeight } = require("../utils/sourceRegistry");

const analyze = require("../services/analyzeService");
const { findOrCreateEntityFromAnalysis } = require("../services/entityService");

const { processPostPipeline } = require("../pipeline/processPostPipeline");

router.post("/reuters", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const FEED_URL =
      "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en";

    const feed = await parser.parseURL(FEED_URL);

    const sourceId = await getSourceId("Reuters");
    const sourceWeight = await getSourceWeight(sourceId);

    const results = [];

    for (const item of feed.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_post_source DO NOTHING
         RETURNING id, content`,
        [item.link, "reuters", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;
      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      const analysis = await analyze(content);

      let entityId = null;
      if (analysis.entity && analysis.entity.name) {
        entityId = await findOrCreateEntityFromAnalysis(analysis, tenantId);

        await db.pool.query(
          `UPDATE posts
           SET entity_id = $1,
               entity_type = $2,
               entity_confidence = $3
           WHERE id = $4`,
          [
            entityId,
            analysis.entityType || null,
            analysis.confidence || null,
            post.id
          ]
        );
      }

      let sentiment = analyzeSentiment(content) * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      if (Array.isArray(analysis.tags)) {
        for (const tag of analysis.tags) {
          await db.pool.query(
            `INSERT INTO post_tags (post_id, tag, tenant_id)
             VALUES ($1, $2, $3)`,
            [post.id, tag, tenantId]
          );
        }
      }

      await processPostPipeline(post.id, content, tenantId);

      results.push({
        id: post.id,
        external_id: item.link,
        sentiment,
        topics,
        entity_id: entityId
      });
    }

    res.json({
      ok: true,
      feed: FEED_URL,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("Reuters ingest error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
