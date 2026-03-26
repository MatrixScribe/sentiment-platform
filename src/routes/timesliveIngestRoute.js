// src/routes/timesliveIngestRoute.js
const express = require("express");
const router = express.Router();
const Parser = require("rss-parser");
const parser = new Parser();
const db = require("../db");
const analyzeSentiment = require("../utils/sentiment");
const { getSourceId } = require("../utils/sourceRegistry");
const extractTopics = require("../utils/topicExtractor");

// POST /api/ingest/timeslive
router.post("/timeslive", async (req, res) => {
  try {
    const FEED_URL =
      "https://news.google.com/rss/search?q=site:timeslive.co.za&hl=en-ZA&gl=ZA&ceid=ZA:en";

    const feed = await parser.parseURL(FEED_URL);
    const sourceId = await getSourceId("TimesLIVE");

    let ingested = 0;
    let posts = [];

    for (const item of feed.items) {
      const externalId = item.link;
      const content = item.title || "";

      // dedupe
      const exists = await db.pool.query(
        `SELECT id FROM posts WHERE external_id = $1`,
        [externalId]
      );
      if (exists.rows.length > 0) continue;

      // sentiment
      const sentimentResult = analyzeSentiment(content);

      // insert post
      const inserted = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, tenant_id, source_id)
         VALUES ($1, $2, $3, 'global', $4)
         RETURNING id`,
        [externalId, "TimesLIVE", content, sourceId]
      );

      const postId = inserted.rows[0].id;

      // sentiment_scores
      await db.pool.query(
        `INSERT INTO sentiment_scores (post_id, sentiment, score, tenant_id)
         VALUES ($1, $2, $3, 'global')`,
        [postId, sentimentResult.sentiment, sentimentResult.score]
      );

      // topics
      const topics = extractTopics(content);
      for (const topic of topics) {
        let topicRow = await db.pool.query(
          `SELECT id FROM topics WHERE name = $1`,
          [topic]
        );

        let topicId;
        if (topicRow.rows.length === 0) {
          const newTopic = await db.pool.query(
            `INSERT INTO topics (name) VALUES ($1) RETURNING id`,
            [topic]
          );
          topicId = newTopic.rows[0].id;
        } else {
          topicId = topicRow.rows[0].id;
        }

        await db.pool.query(
          `INSERT INTO post_topics (post_id, topic_id, tenant_id)
           VALUES ($1, $2, 'global')`,
          [postId, topicId]
        );
      }

      ingested++;
      posts.push({
        id: postId,
        external_id: externalId,
        sentiment: sentimentResult.score,
        topics
      });
    }

    res.json({
      ok: true,
      feed: FEED_URL,
      ingested,
      posts
    });
  } catch (err) {
    console.error("TimesLIVE ingest error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
