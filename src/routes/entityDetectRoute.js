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
    const normalized = entityName.toLowerCase