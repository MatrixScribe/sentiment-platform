// src/services/analyzeService.js
const sentiment = require("../utils/sentiment");
const extractTopics = require("../utils/topics");
const extractTags = require("../utils/tags");
const { detectEntityAI } = require("../ai/entityClassifier");
const db = require("../db");

async function analyze(text) {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: null,
      topics: [],
      tags: [],
      entity: null,
      entityType: null,
      confidence: 0
    };
  }

  // ---------------- SENTIMENT ----------------
  const sentimentResult = sentiment(text); 
  // sentimentResult = { sentiment: "positive|negative|neutral", score: number }

  // ---------------- TOPICS ----------------
  const topics = extractTopics(text); // array of strings

  // ---------------- TAGS ----------------
  const tags = extractTags(text); // array of strings

  // ---------------- ENTITY DETECTION (AI) ----------------
  let entity = null;
  let entityType = null;
  let confidence = 0;

  try {
    const detectedName = await detectEntityAI(text);

    if (detectedName) {
      const allEntities = await db.getAllEntities();
      const match = allEntities.find(e => e.name.toLowerCase() === detectedName.toLowerCase());

      if (match) {
        entity = match;
        entityType = "organization"; // placeholder
        confidence = 0.9;
      }
    }
  } catch (err) {
    console.error("Entity detection failed:", err.message);
  }

  return {
    sentiment: sentimentResult,
    topics,
    tags,
    entity,
    entityType,
    confidence
  };
}

module.exports = analyze;
