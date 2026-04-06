// src/utils/sourceRegistry.js
const db = require("../db");

/**
 * Normalize input:
 * - If number → treat as ID
 * - If string → treat as name
 */
async function resolveSource(input) {
  if (!input) throw new Error("Source key missing");

  // If numeric → treat as ID
  if (!isNaN(input)) {
    const res = await db.pool.query(
      `SELECT id, name, weight, credibility, volume_normalization
       FROM sources WHERE id = $1`,
      [Number(input)]
    );

    if (res.rows.length === 0) {
      throw new Error(`Source not found by ID: ${input}`);
    }

    return res.rows[0];
  }

  // If string → treat as name
  const res = await db.pool.query(
    `SELECT id, name, weight, credibility, volume_normalization
     FROM sources WHERE name = $1`,
    [input]
  );

  if (res.rows.length === 0) {
    throw new Error(`Source not found by name: ${input}`);
  }

  return res.rows[0];
}

/**
 * Return numeric ID
 */
async function getSourceId(input) {
  const src = await resolveSource(input);
  return src.id;
}

/**
 * Return weight multiplier
 */
async function getSourceWeight(input) {
  const src = await resolveSource(input);
  return src.weight || 1.0;
}

/**
 * Return credibility score
 */
async function getSourceCredibility(input) {
  const src = await resolveSource(input);
  return src.credibility || 1.0;
}

/**
 * Return volume normalization factor
 */
async function getSourceVolumeNormalization(input) {
  const src = await resolveSource(input);
  return src.volume_normalization || 1.0;
}

module.exports = {
  getSourceId,
  getSourceWeight,
  getSourceCredibility,
  getSourceVolumeNormalization
};
