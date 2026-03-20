// src/services/nlpService.js

function simpleSentiment(text) {
  const lower = text.toLowerCase();

  const positiveWords = ["good", "great", "positive", "success", "win", "peace"];
  const negativeWords = ["bad", "war", "crisis", "kill", "dead", "attack", "fear"];

  let score = 0;

  for (const w of positiveWords) if (lower.includes(w)) score += 1;
  for (const w of negativeWords) if (lower.includes(w)) score -= 1;

  let sentiment = "neutral";
  if (score > 0) sentiment = "positive";
  if (score < 0) sentiment = "negative";

  return { sentiment, score };
}

function simpleEntities(text) {
  const entities = [];

  const patterns = [
    { type: "country", regex: /\b(iran|israel|china|russia|uk|usa|india|pakistan)\b/gi },
    { type: "region", regex: /\b(middle east|africa|europe)\b/gi },
    { type: "topic", regex: /\b(war|crisis|economy|election|oil|trade)\b/gi }
  ];

  for (const p of patterns) {
    const matches = text.match(p.regex);
    if (matches) {
      for (const m of matches) {
        entities.push({ type: p.type, value: m.toLowerCase() });
      }
    }
  }

  return entities;
}

async function analyzeText(text) {
  const { sentiment, score } = simpleSentiment(text);
  const entities = simpleEntities(text);

  return { sentiment, score, entities };
}

module.exports = { analyzeText };
