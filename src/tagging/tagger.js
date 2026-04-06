const db = require("../db");
const OpenAI = require("openai");
const stringSimilarity = require("string-similarity");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Keyword rules
const KEYWORDS = {
  sarb: ["sarb", "reserve bank", "repo rate", "kganyago"],
  eskom: ["eskom", "load shedding", "loadshedding", "power utility"],
  transnet: ["transnet", "rail freight", "ports"],
  anc: ["anc", "african national congress", "luthuli house"],
  mtn: ["mtn", "telecoms", "mobile operator"],
  "standard-bank": ["standard bank", "stanbic"],
  presidency: ["presidency", "ramaphosa", "union buildings"]
};

const FUZZY_THRESHOLD = 0.72;

// ----------------------
// NER extraction
// ----------------------
async function extractEntities(text) {
  const prompt = `
Extract all organizations, companies, political parties, government bodies, and state-owned enterprises mentioned in the text below.
Return ONLY a JSON array of entity names.

Text:
${text}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return [];
  }
}

// ----------------------
// Resolve entity name → ID
// ----------------------
async function resolveEntity(name) {
  const entities = await db.getAllEntities(); // use helper

  const names = entities.map(e => e.name.toLowerCase());
  const match = stringSimilarity.findBestMatch(name.toLowerCase(), names);

  if (match.bestMatch.rating >= FUZZY_THRESHOLD) {
    return entities[match.bestMatchIndex].id;
  }

  return null;
}

// ----------------------
// Keyword fallback
// ----------------------
async function keywordMatch(text) {
  const lower = text.toLowerCase();

  for (const slug of Object.keys(KEYWORDS)) {
    const words = KEYWORDS[slug];
    if (words.some(w => lower.includes(w))) {
      const entity = await db.pool.query(
        `SELECT id FROM entities WHERE slug = $1`,
        [slug]
      );
      return entity.rows[0]?.id || null;
    }
  }

  return null;
}

// ----------------------
// Main tagging function
// ----------------------
async function tagPost(post) {
  const { id, content } = post;

  // A) NER
  const nerEntities = await extractEntities(content);

  for (const name of nerEntities) {
    const entityId = await resolveEntity(name);
    if (entityId) {
      await db.updatePostEntity(id, entityId); // use helper
      return entityId;
    }
  }

  // B) Keyword fallback
  const keywordId = await keywordMatch(content);
  if (keywordId) {
    await db.updatePostEntity(id, keywordId); // use helper
    return keywordId;
  }

  return null;
}

module.exports = { tagPost };
