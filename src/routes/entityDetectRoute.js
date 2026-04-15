// routes/entityDetectRoute.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { detectEntityAI } = require("../ai/entityClassifier");
const slugify = require("slugify");
const {
  classifyEntityType,
  canonicalizeEntityName,
  extractAliases,
  enrichMetadata,
} = require("../ai/entityOntology");

function makeSlug(name) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}

router.post("/detect", async (req, res) => {
  try {
    const { text, postId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const entityName = await detectEntityAI(text);

    if (!entityName) {
      return res.json({
        entity: null,
        entity_id: null,
        confidence: null,
      });
    }

    const entityType = classifyEntityType(entityName);
    const canonicalName = canonicalizeEntityName(entityName);
    const aliases = extractAliases(entityName);
    const metadata = enrichMetadata(entityName, entityType);
    const classificationConfidence = 0.9;

    const slug = makeSlug(entityName);
    const normalized = entityName.toLowerCase().trim();

    const existing = await db.pool.query(
      `
      SELECT id, name, slug
      FROM entities
      WHERE slug = $1 OR LOWER(name) = $2
      LIMIT 1
      `,
      [slug, normalized]
    );

    let entityId;

    if (existing.rows.length > 0) {
      entityId = existing.rows[0].id;
    } else {
      const insert = await db.pool.query(
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
          $1,  -- name
          $2,  -- slug
          $3,  -- type
          'unknown',
          'Auto‑created entity',
          $4,  -- normalized_name
          $5,  -- canonical_name
          $6,  -- aliases
          $7,  -- metadata
          $8,  -- classification_confidence
          NOW(),
          NOW()
        )
        RETURNING id, name, slug
        `,
        [
          entityName,
          slug,
          entityType,
          normalized,
          canonicalName,
          JSON.stringify(aliases),
          JSON.stringify(metadata),
          classificationConfidence,
        ]
      );

      entityId = insert.rows[0].id;
      console.log("🆕 Auto‑created entity:", entityName, "→", slug, "type:", entityType);
    }

    if (postId) {
      await db.updatePostEntity(postId, entityId);
    }

    return res.json({
      entity: entityName,
      entity_id: entityId,
      type: entityType,
      confidence: classificationConfidence,
    });
  } catch (err) {
    console.error("❌ Entity detection route error:", err);
    return res.status(500).json({ error: "Entity detection failed" });
  }
});

module.exports = router;
