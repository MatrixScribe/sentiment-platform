// src/ai/topicModel.js
const extractTopics = require("../utils/topics");

async function extractTopicsWrapper(text) {
  return extractTopics(text) || [];
}

module.exports = { extractTopics: extractTopicsWrapper };
