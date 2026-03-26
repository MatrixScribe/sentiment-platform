/**
 * Simple keyword-based topic extractor.
 * You can replace this later with NLP, embeddings, or clustering.
 */

module.exports = function extractTopics(text) {
  if (!text) return [];

  const lower = text.toLowerCase();

  const topicKeywords = [
    "crime", "corruption", "economy", "politics", "election",
    "energy", "power", "eskom", "load shedding", "government",
    "health", "education", "transport", "violence", "protest",
    "court", "law", "business", "finance", "trade", "market",
    "weather", "sport", "technology", "science"
  ];

  const topics = [];

  for (const keyword of topicKeywords) {
    if (lower.includes(keyword)) {
      topics.push(keyword);
    }
  }

  // fallback: use first noun-like word
  if (topics.length === 0) {
    const words = lower.split(/\W+/).filter(w => w.length > 4);
    if (words[0]) topics.push(words[0]);
  }

  // dedupe
  return [...new Set(topics)];
};
