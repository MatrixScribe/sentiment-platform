// routes/entityDetectRoute.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { detectEntityAI } = require("../ai/entityClassifier");
const slugify = require("slugify");

// Utility: normalize entity names → slugs
function makeSlug(name) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true
  });
}

router.post("/detect", async (req, res) => {
  try {
    const { text, postId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // 1) Run GPT‑4o classification
    const entityName = await detectEntityAI(text);

    if (!entityName) {
      return res.json({
        entity: null,
        entity_id: null,
        confidence: null
      });
    }

    // 2) Normalize + slugify
    const slug = makeSlug(entityName);
    const normalized = entityName.toLowerCase().trim();   // ⭐ FIXED LINE

    // 3) Check if entity already exists
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
      // Entity exists
      entityId = existing.rows[0].id;
    } else {
      // 4) AUTO‑CREATE ENTITY
      const insert = await db.pool.query(
        `
        INSERT INTO entities (name, slug, type, region, description, normalized_name, created_at, updated_at)
        VALUES ($1, $2, 'unknown', 'unknown', 'Auto‑created entity', $3, NOW(), NOW())
        RETURNING id, name, slug
        `,
        [entityName, slug, normalized]
      );

      entityId = insert.rows[0].id;
      console.log("🆕 Auto‑created entity:", entityName, "→", slug);
    }

    // 5) If postId provided, update DB
    if (postId) {
      await db.updatePostEntity(postId, entityId);
    }

    return res.json({
      entity: entityName,
      entity_id: entityId,
      confidence: 0.95
    });

  } catch (err) {
    console.error("❌ Entity detection route error:", err);
    return res.status(500).json({ error: "Entity detection failed" });
  }
});

module.exports = router;
