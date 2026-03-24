// src/utils/similarity.js
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function termFrequency(tokens) {
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  const total = tokens.length || 1;
  for (const t in tf) {
    tf[t] = tf[t] / total;
  }
  return tf;
}

function buildVocabulary(docs) {
  const vocab = new Set();
  for (const doc of docs) {
    for (const term of Object.keys(doc)) {
      vocab.add(term);
    }
  }
  return Array.from(vocab);
}

function vectorize(tf, vocab) {
  return vocab.map(term => tf[term] || 0);
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function computeSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);

  const vocab = buildVocabulary([tfA, tfB]);

  const vecA = vectorize(tfA, vocab);
  const vecB = vectorize(tfB, vocab);

  return cosineSimilarity(vecA, vecB);
}

module.exports = {
  computeSimilarity
};
