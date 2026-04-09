// src/ai/sentimentModel.js
const analyzeSentiment = require("../utils/sentiment");

async function analyzeSentimentWrapper(text) {
  // Your existing sentiment returns a number
  const score = analyzeSentiment(text);

  return {
    label: score >= 0 ? "positive" : "negative",
    score
  };
}

module.exports = { analyzeSentiment: analyzeSentimentWrapper };
