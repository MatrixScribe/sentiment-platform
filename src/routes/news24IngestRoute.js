// src/routes/news24IngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');

// News24 Top Stories HTML page (proxied)
const FLY_PROXY_NEWS24 =
  "https://matrix-proxy.fly.dev/proxy?url=https%3A%2F%2Fwww.news24.com%2Fnews24%2Flatest";

router.post('/news24', async (req, res) => {
  try {
    const feed = req.body.feed || FLY_PROXY_NEWS24;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("News24");
    const sourceWeight = await getSourceWeight(sourceId);

    // Fetch HTML through Fly.io
    const response = await fetch(feed, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const articles = [];

    // News24 article blocks
    $(".article-card, .listing__item, article").each((i, el) => {
      const title = $(el).find("h2, h3, .article-card__title").text().trim();
      const link = $(el).find("a").attr("href");
      const summary = $(el).find("p, .article-card__intro").text().trim();

      if (!title || !link) return;

      // Normalize link
      const fullLink = link.startsWith("http")
        ? link
        : `https://www.news24.com${link}`;

      articles.push({
        title,
        link: fullLink,
        summary
      });
    });

    const results = [];

    for (const item of articles) {
      const content = `${item.title}\n\n${item.summary}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_post_source DO NOTHING
         RETURNING id, content`,
        [item.link, "news24", sourceId, content, contentHash, tenantId]
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
        external_id: item.link,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      feed,
      extracted: articles.length,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("News24 ingestion error:", err);
    res.status(500).json({ error: "Failed to ingest News24 (HTML)" });
  }
});

module.exports = router;
