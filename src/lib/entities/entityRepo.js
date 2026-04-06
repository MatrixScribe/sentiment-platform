const { pool } = require("../../db");
const { normalizeString } = require("./normalize");

async function findEntityByExactName(name) {
  const res = await pool.query(
    "SELECT id, slug, name FROM entities WHERE name = $1 LIMIT 1",
    [name]
  );
  return res.rows[0] || null;
}

async function findEntityBySlug(slug) {
  const res = await pool.query(
    "SELECT id, slug, name FROM entities WHERE slug = $1 LIMIT 1",
    [slug]
  );
  return res.rows[0] || null;
}

async function findEntityByNormalizedName(norm) {
  const res = await pool.query(
    "SELECT id, slug, name FROM entities WHERE normalized_name = $1 LIMIT 1",
    [norm]
  );
  return res.rows[0] || null;
}

async function createEntityFromName(name) {
  const norm = normalizeString(name);
  const slug = norm.replace(/\s+/g, "-");

  const res = await pool.query(
    `INSERT INTO entities (slug, name, type, region, description, normalized_name)
     VALUES ($1, $2, 'unknown', 'unknown', NULL, $3)
     RETURNING id, slug, name`,
    [slug, name, norm]
  );

  return res.rows[0];
}

module.exports = {
  findEntityByExactName,
  findEntityBySlug,
  findEntityByNormalizedName,
  createEntityFromName
};
