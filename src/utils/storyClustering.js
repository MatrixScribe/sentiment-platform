// src/utils/storyClustering.js
const { computeSimilarity } = require("./similarity");
const db = require("../db");

// Threshold for "same story"
const SIMILARITY_THRESHOLD = 0.78;

// How many recent posts to compare against
const RECENT_POST_LIMIT = 200;

// How far back in time to look (in hours)
const RECENT_HOURS = 48;

async function findOrCreateClusterForPost(postId, content, tenantId) {
  // 1. Fetch recent posts for this tenant
  const recent = await db.pool.query(
    `SELECT id, content, cluster_id
     FROM posts
     WHERE tenant_id = $1
       AND id <> $2
       AND created_at >= NOW() - INTERVAL '${RECENT_HOURS} hours'
     ORDER BY created_at DESC
     LIMIT ${RECENT_POST_LIMIT}`,
    [tenantId, postId]
  );

  let bestMatch = null;
  let bestScore = 0;

  for (const row of recent.rows) {
    const score = computeSimilarity(content, row.content);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  // 2. If no good match, create a new cluster
  if (!bestMatch || bestScore < SIMILARITY_THRESHOLD) {
    const clusterRes = await db.pool.query(
      `INSERT INTO story_clusters (canonical_post_id)
       VALUES ($1)
       RETURNING id`,
      [postId]
    );

    const clusterId = clusterRes.rows[0].id;

    await db.pool.query(
      `INSERT INTO story_cluster_members (cluster_id, post_id)
       VALUES ($1, $2)`,
      [clusterId, postId]
    );

    await db.pool.query(
      `UPDATE posts SET cluster_id = $1 WHERE id = $2`,
      [clusterId, postId]
    );

    return { clusterId, createdNew: true, similarity: bestScore };
  }

  // 3. If match found, join existing cluster (or create one if missing)
  let clusterId = bestMatch.cluster_id;

  if (!clusterId) {
    // Best match has no cluster yet → create one and add both
    const clusterRes = await db.pool.query(
      `INSERT INTO story_clusters (canonical_post_id)
       VALUES ($1)
       RETURNING id`,
      [bestMatch.id]
    );
    clusterId = clusterRes.rows[0].id;

    await db.pool.query(
      `INSERT INTO story_cluster_members (cluster_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [clusterId, bestMatch.id]
    );

    await db.pool.query(
      `UPDATE posts SET cluster_id = $1 WHERE id = $2`,
      [clusterId, bestMatch.id]
    );
  }

  // Add new post to that cluster
  await db.pool.query(
    `INSERT INTO story_cluster_members (cluster_id, post_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [clusterId, postId]
  );

  await db.pool.query(
    `UPDATE posts SET cluster_id = $1 WHERE id = $2`,
    [clusterId, postId]
  );

  return { clusterId, createdNew: false, similarity: bestScore };
}

module.exports = {
  findOrCreateClusterForPost
};
