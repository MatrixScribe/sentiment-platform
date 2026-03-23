// src/utils/sentiment.js

module.exports = function analyzeSentiment(text) {
  const lower = text.toLowerCase();

  const positiveWords = ["good", "great", "excellent", "positive", "growth", "improving", "strong", "success"];
  const negativeWords = ["bad", "poor", "negative", "decline", "crisis", "weak", "problem", "corruption"];

  let score = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) score += 1;
  }

  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 1;
  }

  let sentiment = "neutral";
  if (score > 0) sentiment = "positive";
  if (score < 0) sentiment = "negative";

  return {
    sentiment,
    score
  };
};
