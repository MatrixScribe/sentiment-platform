// src/utils/sourceRegistry.js
const db = require("../db");

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

async function getSourceWeight(sourceId) {
  const res = await db.pool.query(
    `SELECT weight FROM sources WHERE id = $1`,
    [sourceId]
  );

  return res.rows[0].weight;
}

module.exports = {
  getSourceId,
  getSourceWeight
};
