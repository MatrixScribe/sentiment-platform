// src/routes/reutersIngestRoute.js
const express = require("express");
const router = express.Router();
const Parser = require("rss-parser");
const parser = new Parser();

const db = require("../../db");
const analyzeSentiment = require("../../utils/sentiment");
const { getSourceId } = require("../../utils/sourceRegistry");

router.get("/", async (req, res) => {
  try {
    const feedUrl =
      "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en";

    const feed = await parser.parseURL(feedUrl);

    const sourceId = await getSourceId("Reuters");

    let ingested = 0;
    const posts = [];

    for (const item of feed.items) {
      const externalId = item.link;
      const title = item.title || "";
      const content = title;

      // dedupe
      const exists = await db.pool.query(
        `SELECT id FROM posts WHERE external_id = $1`,
        [externalId]
      );

      if (exists.rows.length > 0) continue;

      // sentiment
      const { sentiment, score } = analyzeSentiment(content);

      // insert post
      const inserted = await db.pool.query(
        `INSERT INTO posts (external_id, source, content, tenant_id, source_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [externalId, "Reuters", content, "global", sourceId]
      );

      const postId = inserted.rows[0].id;

      // store sentiment
      await db.pool.query(
        `INSERT INTO sentiment_scores (post_id, sentiment, score, tenant_id)
         VALUES ($1, $2, $3, $4)`,
        [postId, sentiment, score, "global"]
      );

      posts.push({
        id: postId,
        external_id: externalId,
        sentiment,
        topics: []
      });

      ingested++;
    }

    res.json({
      ok: true,
      feed: feedUrl,
      ingested,
      posts
    });
  } catch (err) {
    console.error("Reuters ingestion error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

