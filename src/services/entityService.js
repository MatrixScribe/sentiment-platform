// src/services/entityService.js
const { pool } = require("../db");
const slugify = require("slugify");

// Normalize entity names
function normalizeName(name) {
  return name.trim().toLowerCase();
}

// Generate clean slug
function makeSlug(name) {
  return slugify(name, { lower: true, strict: true });
}

async function findOrCreateEntityFromAnalysis(analysis, tenantId) {
  if (!analysis || !analysis.entity || !analysis.entity.name) {
    return null;
  }

  const name = analysis.entity.name;
  const type = analysis.entityType || null;
  const region = analysis.region || null;

  const normalizedName = normalizeName(name);
  const slug = makeSlug(name); // ⭐ Use original name for slug, not normalized

  // 1) Try to find existing entity by slug
  const bySlug = await pool.query(
    `
    SELECT id
    FROM entities
    WHERE slug = $1
    LIMIT 1
    `,
    [slug]
  );

  if (bySlug.rows.length > 0) {
    return bySlug.rows[0].id;
  }

  // 2) Try to find existing entity by normalized_name
  const byNormalized = await pool.query(
    `
    SELECT id
    FROM entities
    WHERE normalized_name = $1
    LIMIT 1
    `,
    [normalizedName]
  );

  if (byNormalized.rows.length > 0) {
    return byNormalized.rows[0].id;
  }

  // 3) AUTO‑CREATE ENTITY
  const insert = await pool.query(
    `
    INSERT INTO entities (name, slug, type, region, normalized_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id
    `,
    [name, slug, type, region, normalizedName]
  );

  console.log("🆕 Auto‑created entity:", name, "→", slug);

  return insert.rows[0].id;
}

module.exports = {
  findOrCreateEntityFromAnalysis,
};
