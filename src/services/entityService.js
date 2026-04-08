// src/services/entityService.js
const { pool } = require("../db");
const slugify = require("slugify");

/**
 * Normalize entity names for consistent matching.
 * Example:
 *   "South Africa" → "south africa"
 *   "ANC" → "anc"
 */
function normalizeName(name) {
  return name.trim().toLowerCase();
}

/**
 * Generate a clean slug for URLs.
 * Example:
 *   "south africa" → "south-africa"
 *   "African National Congress" → "african-national-congress"
 */
function makeSlug(name) {
  return slugify(name, { lower: true, strict: true });
}

/**
 * Find an existing entity OR create a new one.
 * This is the core of your entity linking pipeline.
 *
 * analysis.entity.name → required
 * analysis.entityType → optional
 * analysis.region → optional
 */
async function findOrCreateEntityFromAnalysis(analysis, tenantId) {
  if (!analysis || !analysis.entity || !analysis.entity.name) {
    return null;
  }

  const name = analysis.entity.name;
  const type = analysis.entityType || null;
  const region = analysis.region || null;

  const normalizedName = normalizeName(name);
  const slug = makeSlug(normalizedName);

  // 1) Try to find existing entity by normalized name
  const existing = await pool.query(
    `
    SELECT id
    FROM entities
    WHERE normalized_name = $1
    LIMIT 1
    `,
    [normalizedName]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // 2) Create a new entity
  const insert = await pool.query(
    `
    INSERT INTO entities (name, slug, type, region, normalized_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id
    `,
    [name, slug, type, region, normalizedName]
  );

  return insert.rows[0].id;
}

module.exports = {
  findOrCreateEntityFromAnalysis,
};
