const db = require("../db");

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

module.exports = {
  getSourceId,
  getSourceMeta
};
