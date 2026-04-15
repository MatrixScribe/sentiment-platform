// services/analyzeService.js

const { detectEntityAI } = require("../ai/entityClassifier");

// TEMP placeholder models.
// Replace these with your real sentiment + topic models.
async function someSentimentModel(content) {
  return {
    sentiment: "neutral",
    score: 0.0,
  };
}

async function someTopicModel(content) {
  return [];
}

module.exports = async function analyze(content) {
  // 1. Sentiment
  const sentiment = await someSentimentModel(content);

  // 2. Topics
  const topics = await someTopicModel(content);

  // 3. Entity extraction (REQUIRED for ontology pipeline)
  const entity = await detectEntityAI(content);

  return {
    sentiment,
    topics,
    entity,
  };
};
