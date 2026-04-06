// src/services/ingestPipeline.js
const db = require("../db");
const analyze = require("./analyzeService");
const { getSourceId, getSourceWeight } = require("../utils/sourceRegistry");
const { findOrCreateClusterForPost } = require("../utils/storyClustering");
const hashContent = require("../utils/hash");

/**
 * Universal ingest pipeline
 *
 * options:
 *  - sourceKey: string (e.g. "BBC", "Reddit", "News24")
 *  - sourceCode: string (short code stored in posts.source, e.g. "bbc", "reddit")
 *  - tenantId: string ("global" or req.user.tenant_id)
 *  - externalId: string (unique per source)
 *  - content: string
 *  - allowHashDedupe: boolean (default true)
 *  - hashConstraint: string (e.g. "unique_content_hash" or "unique_post_source")
 *  - applySourceWeight: boolean (default false)
 */
async function ingestPost({
  sourceKey,
  sourceCode,
  tenantId,
  externalId,
  content,
  allowHashDedupe = true,
  hashConstraint = null,
  applySourceWeight = false
}) {
  if (!content || !externalId || !sourceKey || !sourceCode || !tenantId) {
    throw new Error("Missing required ingest parameters");
  }

  const sourceId = await getSourceId(sourceKey);
  const sourceWeight = applySourceWeight ? await getSourceWeight(sourceId) : 1;

  const contentHash = allowHashDedupe ? hashContent(content) : null;

  // Insert post with optional hash + conflict handling
  let insertQuery;
  let insertParams;

  if (allowHashDedupe && hashConstraint) {
    insertQuery = `
      INSERT INTO posts (external_id, source, source_id, content, content_hash, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ON CONSTRAINT ${hashConstraint} DO NOTHING
      RETURNING id, content, created_at
    `;
    insertParams = [externalId, sourceCode, sourceId, content, contentHash, tenantId];
  } else {
    insertQuery = `
      INSERT INTO posts (external_id, source, source_id, content, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (external_id) DO NOTHING
      RETURNING id, content, created_at
    `;
    insertParams = [externalId, sourceCode, sourceId, content, tenantId];
  }

  const insert = await db.pool.query(insertQuery, insertParams);
  if (insert.rows.length === 0) {
    // deduped
    return null;
  }

  const post = insert.rows[0];

  // Cluster
  await findOrCreateClusterForPost(post.id, content, tenantId);

  // Unified analysis
  const analysis = await analyze(content);

  // Update entity info
  if (analysis.entity) {
    await db.pool.query(
      `
      UPDATE posts
      SET entity_id = $1,
          entity_type = $2,
          entity_confidence = $3
      WHERE id = $4
      `,
      [
        analysis.entity.id || null,
        analysis.entityType || null,
        analysis.confidence || 0,
        post.id
      ]
    );
  }

  // Sentiment (weighted if needed)
  if (analysis.sentiment) {
    let score = analysis.sentiment.score || 0;
    score = score * sourceWeight;

    await db.insertSentimentResult(post.id, score, tenantId);
  }

  // Topics
  if (Array.isArray(analysis.topics) && analysis.topics.length > 0) {
    await db.insertPostTopics(post.id, analysis.topics, tenantId);
  }

  // Tags
  if (Array.isArray(analysis.tags) && analysis.tags.length > 0) {
    for (const tag of analysis.tags) {
      await db.pool.query(
        `
        INSERT INTO post_tags (post_id, tag, tenant_id)
        VALUES ($1, $2, $3)
        `,
        [post.id, tag, tenantId]
      );
    }
  }

  return {
    id: post.id,
    external_id: externalId,
    sentiment: analysis.sentiment ? analysis.sentiment.score : null,
    topics: analysis.topics || [],
    tags: analysis.tags || [],
    entity: analysis.entity || null
  };
}

module.exports = { ingestPost };
