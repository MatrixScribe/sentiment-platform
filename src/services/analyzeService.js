// src/services/analyzeService.js

const nlpService = require("./nlpService");
const sentimentService = require("./sentimentService");
const topicService = require("./topicService");
const tagger = require("../tagging/tagger");
const entityClassifier = require("../ai/entityClassifier");
const { resolveEntityForText } = require("../lib/entities/entityResolver");

module.exports = async function analyze(content) {
  if (!content || typeof content !== "string") {
    return {
      entity: null,
      sentiment: null,
      topics: [],
      tags: [],
      entityType: null,
      confidence: 0,
    };
  }

  // 1. Normalize text
  const clean = nlpService.preprocess
    ? nlpService.preprocess(content)
    : content.trim();

  // 2. Entity resolution (new resolver)
  const entityResult = await resolveEntityForText(clean, {
    allowAutoCreate: true,
  });

  // 3. Sentiment analysis (old engine)
  const sentiment = await sentimentService.analyze(clean);

  // 4. Topic classification (old engine)
  const topics = await topicService.classify(clean);

  // 5. Keyword tagging (old tagger)
  const tags = tagger.extractTags
    ? tagger.extractTags(clean)
    : [];

  // 6. Entity type classification (old classifier)
  let entityType = null;
  if (entityResult && entityResult.name) {
    entityType = entityClassifier.classify
      ? entityClassifier.classify(entityResult.name)
      : null;
  }

  return {
    entity: entityResult || null,
    sentiment: sentiment || null,
    topics: topics || [],
    tags: tags || [],
    entityType: entityType || null,
    confidence: entityResult?.confidence || 0,
  };
};
