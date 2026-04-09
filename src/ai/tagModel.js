// src/ai/tagModel.js
// Tags come from analyzeService, but pipeline expects a standalone extractor.
// We fallback to simple keyword extraction.

function extractTagsWrapper(text) {
  if (!text) return [];
  const words = text.split(/\W+/).filter(w => w.length > 5);
  return [...new Set(words.slice(0, 5))];
}

module.exports = { extractTags: extractTagsWrapper };
