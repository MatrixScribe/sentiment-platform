// lib/entities/upsertEntity.js
const { pool } = require("../../db");
const slugify = require("slugify");
const {
  classifyEntityType,
  canonicalizeEntityName,
  extractAliases,
  enrichMetadata,
} = require("../../ai/entityOntology");

function makeSlug(name) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}

async function upsertEntity(rawName) {
  if (!rawName) return null;

  const name = rawName.trim();
  const slug = makeSlug(name);
  const normalized = name.toLowerCase();

  const type = classifyEntityType(name);
  const canonicalName = canonicalizeEntityName(name);
  const aliases = extractAliases(name);
  const metadata = enrichMetadata(name, type);
  const confidence = 0.9;

  // 1. Check if exists
  const existing = await pool.query(
    `
    SELECT id
    FROM entities
    WHERE slug = $1 OR normalized_name = $2
    LIMIT 1
    `,
    [slug, normalized]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // 2. Create new entity
  const insert = await pool.query(
    `
    INSERT INTO entities (
      name,
      slug,
      type,
      region,
      description,
      normalized_name,
      canonical_name,
      aliases,
      metadata,
      classification_confidence,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3,
      'unknown',
      'Auto‑created entity',
      $4,
      $5,
      $6,
      $7,
      $8,
      NOW(),
      NOW()
    )
    RETURNING id
    `,
    [
      name,
      slug,
      type,
      normalized,
      canonicalName,
      JSON.stringify(aliases),
      JSON.stringify(metadata),
      confidence,
    ]
  );

  console.log("🆕 Auto‑created entity:", name, "→", slug, "type:", type);

  return insert.rows[0].id;
}

module.exports = { upsertEntity };
