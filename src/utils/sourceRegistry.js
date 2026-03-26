// src/utils/sourceRegistry.js
const db = require("../db");

/**
 * Returns the ID of a source by name.
 * Throws if the source does not exist.
 */
async function getSourceId(sourceName) {
  const res = await db.pool.query(
    `SELECT id FROM sources WHERE name = $1`,
    [sourceName]
  );

  if (res.rows.length === 0) {
    throw new Error(`Source not found in registry: ${sourceName}`);
  }

  return res.rows[0].id;
}

/**
 * Returns the weight of a source by ID.
 * If weight is NULL or missing, fallback to 1.0.
 */
async function getSourceWeight(sourceId) {
  const res = await db.pool.query(
    `SELECT weight FROM sources WHERE id = $1`,
    [sourceId]
  );

  // Fallback ensures sentiment NEVER becomes null
  return res.rows[0]?.weight ?? 1.0;
}

module.exports = {
  getSourceId,
  getSourceWeight
};
