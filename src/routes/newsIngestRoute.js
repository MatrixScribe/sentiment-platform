// src/routes/newsIngestRoute.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const analyzeSentiment = require('../utils/sentiment');
const extractTopics = require('../utils/topics');
const hashContent = require('../utils/hash');
const { findOrCreateClusterForPost } = require('../utils/storyClustering');
const { getSourceId, getSourceWeight } = require('../utils/sourceRegistry');
const fetch = require('node-fetch');

// SAFETY: Ensure API_BASE_URL is absolute
const API_BASE = process.env.API_BASE_URL;
if (!API_BASE || !API_BASE.startsWith("http")) {
  console.error("❌ ERROR: API_BASE_URL is missing or invalid:", API_BASE);
}

router.post('/news', async (req, res) => {
  try {
    const { query = "south africa", limit = 5 } = req.body;
    const tenantId = req.user.tenant_id;

    const sourceId = await getSourceId("News24");
    const sourceWeight = await getSourceWeight(sourceId);

    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&language=en&country=za&size=${limit}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "MatrixScribeBot/1.0" }
    });

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      return res.status(400).json({
        error: "Invalid query or no news returned",
        details: data
      });
    }

    const results = [];

    for (const article of data.results) {
      const content = `${article.title}\n\n${article.description || ""}\n\n${article.content || ""}`;
      const contentHash = hashContent(content);

      const insert = await db.pool.query(
        `INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT unique_content_hash DO NOTHING
         RETURNING id, content, created_at`,
        [article.link, "news", sourceId, content, contentHash, tenantId]
      );

      if (insert.rows.length === 0) continue;

      const post = insert.rows[0];

      await findOrCreateClusterForPost(post.id, content, tenantId);

      let sentiment = analyzeSentiment(content);
      sentiment = sentiment * sourceWeight;
      await db.insertSentimentResult(post.id, sentiment, tenantId);

      const topics = extractTopics(content);
      await db.insertPostTopics(post.id, topics, tenantId);

      // ⭐ ENTITY DETECTION (SAFE + LOGGING)
      let entities = [];
      try {
        const entityResponse = await fetch(`${API_BASE}/api/entities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization
          },
          body: JSON.stringify({ text: content })
        });

        const json = await entityResponse.json();
        entities = json.entities || [];
      } catch (err) {
        console.error("❌ Entity detection failed:", err.message);
      }

      // ⭐ LINK POST → FIRST ENTITY
      if (entities.length > 0) {
        try {
          await db.pool.query(
            `UPDATE posts SET entity_id = $1 WHERE id = $2`,
            [entities[0].id, post.id]
          );

          // ⭐ OPTIONAL: Trigger enrichment if available
          if (db.updateEntityScorecard) {
            await db.updateEntityScorecard(entities[0].id);
          }
        } catch (err) {
          console.error("❌ Failed to link entity:", err.message);
        }
      }

      results.push({
        id: post.id,
        external_id: article.link,
        sentiment,
        topics
      });
    }

    res.json({
      ok: true,
      query,
      ingested: results.length,
      posts: results
    });

  } catch (err) {
    console.error("News ingestion error:", err.message);
    res.status(500).json({ error: "Failed to ingest news", details: err.message });
  }
});

module.exports = router;
