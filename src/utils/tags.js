// src/utils/tags.js

/**
 * Very simple tag extractor.
 * You can expand this later.
 */
module.exports = function extractTags(text) {
  if (!text) return [];

  const lower = text.toLowerCase();

  const tags = [];

  // Basic keyword tagging
  const keywordMap = {
    economy: ["economy", "inflation", "gdp", "interest rate", "reserve bank"],
    politics: ["election", "government", "minister", "president", "policy"],
    crime: ["crime", "police", "arrest", "court", "violence"],
    tech: ["technology", "ai", "software", "hardware", "startup"],
    finance: ["market", "stocks", "currency", "rand", "dollar", "finance"],
    energy: ["energy", "eskom", "load shedding", "power", "electricity"],
    health: ["health", "hospital", "virus", "covid", "disease"],
    environment: ["climate", "environment", "pollution", "weather"]
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => lower.includes(k))) {
      tags.push(tag);
    }
  }

  return tags;
};
