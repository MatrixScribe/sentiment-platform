// src/utils/topics.js

module.exports = function extractTopics(text) {
  const lower = text.toLowerCase();

  const topicKeywords = [
    "energy", "politics", "economy", "crime", "education",
    "health", "corruption", "elections", "south africa",
    "government", "reforms", "power", "loadshedding"
  ];

  const topics = [];

  for (const keyword of topicKeywords) {
    if (lower.includes(keyword)) {
      topics.push(keyword);
    }
  }

  // fallback: pick 1–2 generic keywords
  if (topics.length === 0) {
    const words = lower.split(/\W+/).filter(w => w.length > 5);
    topics.push(...words.slice(0, 2));
  }

  return topics;
};
