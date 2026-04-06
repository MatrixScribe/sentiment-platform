// src/utils/sourceRegistry.js
const db = require("../db");

/**
 * Fetch source ID by name.
 * Example: getSourceId("BBC") → 1
 */
async function getSourceId(name) {
  const res = await db.pool.query(
    `SELECT id FROM sources WHERE name = $1`,
    [name]
  );

  if (res.rows.length === 0) {
    throw new Error(`Source not found: ${name}`);
  }

  return res.rows[0].id;
}

/**
 * Fetch full metadata for a source.
 * Includes: weight, credibility, volume_normalization
 */
async function getSourceMeta(id) {
  const res = await db.pool.query(
    `SELECT weight, credibility, volume_normalization
     FROM sources WHERE id = $1`,
    [id]
  );

  if (res.rows.length === 0) {
    throw new Error(`Source metadata missing for id: ${id}`);
  }

  return res.rows[0];
}

/**
 * Return only the weight multiplier.
 */
async function getSourceWeight(name) {
  const id = await getSourceId(name);
  const meta = await getSourceMeta(id);
  return meta.weight || 1.0;
}

/**
 * Return credibility score (optional future use).
 */
async function getSourceCredibility(name) {
  const id = await getSourceId(name);
  const meta = await getSourceMeta(id);
  return meta.credibility || 1.0;
}

/**
 * Return volume normalization factor (optional future use).
 */
async function getSourceVolumeNormalization(name) {
  const id = await getSourceId(name);
  const meta = await getSourceMeta(id);
  return meta.volume_normalization || 1.0;
}

module.exports = {
  getSourceId,
  getSourceMeta,
  getSourceWeight,
  getSourceCredibility,
  getSourceVolumeNormalization
};
