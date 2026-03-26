// src/utils/sentiment.js

/**
 * Simple keyword-based sentiment analyzer.
 * Always returns a numeric score (never null, never an object).
 */
module.exports = function analyzeSentiment(text) {
  if (!text || typeof text !== "string") {
    return 0; // neutral fallback
  }

  const lower = text.toLowerCase();

  const positiveWords = [
    "good", "great", "excellent", "positive", "growth",
    "improving", "strong", "success"
  ];

  const negativeWords = [
    "bad", "poor", "negative", "decline", "crisis",
    "weak", "problem", "corruption"
  ];

  let score = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) score += 1;
  }

  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 1;
  }

  // Always return a number
  return score;
};
