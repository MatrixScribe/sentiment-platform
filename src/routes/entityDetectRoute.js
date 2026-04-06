// routes/entityDetectRoute.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { detectEntityAI } = require("../ai/entityClassifier");

router.post("/detect", async (req, res) => {
  try {
    const { text, postId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Run GPT‑4o classification
    const entityName = await detectEntityAI(text);

    if (!entityName) {
      return res.json({
        entity: null,
        entity_id: null,
        confidence: null
      });
    }

    // Fetch all entities to map name → id
    const entities = await db.getAllEntitiesWithDescriptions();
    const entity = entities.find(e => e.name === entityName);

    if (!entity) {
      return res.json({
        entity: null,
        entity_id: null,
        confidence: null
      });
    }

    // If postId provided, update DB
    if (postId) {
      await db.updatePostEntity(postId, entity.id);
    }

    return res.json({
      entity: entity.name,
      entity_id: entity.id,
      confidence: 0.95 // placeholder until we add scoring
    });

  } catch (err) {
    console.error("❌ Entity detection route error:", err);
    return res.status(500).json({ error: "Entity detection failed" });
  }
});

module.exports = router;
