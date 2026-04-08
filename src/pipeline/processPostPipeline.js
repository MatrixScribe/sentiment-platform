// src/pipeline/processPostPipeline.js
const db = require("../db");
const { detectEntityAI } = require("../ai/entityClassifier");
const slugify = require("slugify");
const { analyzeSentiment } = require("../ai/sentimentModel");
const { extractTopics } = require("../ai/topicModel");
const { extractTags } = require("../ai/tagModel");

// Utility: normalize → slug
function makeSlug(name) {
  return slugify(name, { lower: true, strict: true, trim: true });
}

async function processPostPipeline(postId, text) {
  // 1) Detect entity name
  const entityName = await detectEntityAI(text);

  if (!entityName) {
    console.log("⚠️ No entity detected for post:", postId);
    return;
  }

  const slug = makeSlug(entityName);
  const normalized = entityName.toLowerCase().trim();

  // 2) Check if entity exists
  const existing = await db.pool.query(
    `
    SELECT id FROM entities
    WHERE slug = $1 OR LOWER(name) = $2
    LIMIT 1
    `,
    [slug, normalized]
  );

  let entityId;

  if (existing.rows.length > 0) {
    entityId = existing.rows[0].id;
  } else {
    // 3) AUTO‑CREATE ENTITY
    const insert = await db.pool.query(
      `
      INSERT INTO entities (name, slug, type, region, description, normalized_name, created_at, updated_at)
      VALUES ($1, $2, 'unknown', 'unknown', 'Auto‑created entity', $3, NOW(), NOW())
      RETURNING id
      `,
      [entityName, slug, normalized]
    );

    entityId = insert.rows[0].id;
    console.log("🆕 Auto‑created entity:", entityName, "→", slug);
  }

  // 4) Link post → entity
  await db.updatePostEntity(postId, entityId);

  // 5) Sentiment scoring
  const sentiment = await analyzeSentiment(text);
  await db.pool.query(
    `
    INSERT INTO sentiment_scores (post_id, sentiment, score)
    VALUES ($1, $2, $3)
    `,
    [postId, sentiment.label, sentiment.score]
  );

  // 6) Topic extraction
  const topics = await extractTopics(text);
  for (const topic of topics) {
    await db.pool.query(
      `
      INSERT INTO post_topics (post_id, topic_id)
      VALUES ($1, (SELECT id FROM topics WHERE name = $2 LIMIT 1))
      ON CONFLICT DO NOTHING
      `,
      [postId, topic]
    );
  }

  // 7) Tag extraction
  const tags = await extractTags(text);
  for (const tag of tags) {
    await db.pool.query(
      `
      INSERT INTO post_tags (post_id, tag)
      VALUES ($1, $2)
      `,
      [postId, tag]
    );
  }

  console.log("✅ Pipeline complete for post:", postId);
}

module.exports = { processPostPipeline };
