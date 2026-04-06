const { normalizeString } = require("./normalize");
const { ENTITY_ALIASES } = require("./aliases");
const { STOPWORDS } = require("./stopwords");
const {
  findEntityByExactName,
  findEntityBySlug,
  findEntityByNormalizedName,
  createEntityFromName
} = require("./entityRepo");

// Generic nouns we NEVER want as entities
const GENERIC_NOUNS = new Set([
  "oil", "water", "food", "energy", "inflation", "economy", "market",
  "crisis", "growth", "power", "health", "education", "transport",
  "crime", "violence", "weather", "rain", "storm", "heat", "cold",
  "winter", "summer", "autumn", "spring", "news", "sport", "sports",
  "migrants", "refugees", "protesters", "citizens", "workers",
  "students", "teachers", "doctors", "nurses", "investigation",
  "analysis", "review", "report", "case", "probe"
]);

// Titles we strip to extract the person
const TITLE_WORDS = [
  "president",
  "prime minister",
  "minister",
  "secretary",
  "governor",
  "mayor",
  "senator",
  "mp",
  "representative",
  "ambassador",
  "chief",
  "judge",
  "premier"
];

// Media suffixes we reject
const MEDIA_SUFFIXES = ["videos", "photos", "images", "clips", "footage", "live", "breaking"];

// Normalize possessives: "Iran’s" → "Iran"
function stripPossessive(text) {
  return text.replace(/['’]s$/i, "");
}

// Extract the person name from a title phrase
function stripTitle(text) {
  const lower = text.toLowerCase();

  for (const title of TITLE_WORDS) {
    if (lower.startsWith(title + " ")) {
      return text.split(" ").slice(title.split(" ").length).join(" ");
    }
  }

  // Country + title + name
  const parts = text.split(" ");
  if (parts.length > 2) {
    const maybeTitle = parts.slice(1, 3).join(" ").toLowerCase();
    if (TITLE_WORDS.includes(maybeTitle)) {
      return parts.slice(3).join(" ");
    }
  }

  return text;
}

// Detect if a token looks like a proper noun
function isProperNoun(token) {
  return /^[A-Z][a-z]+/.test(token);
}

// STRICT MODE: Only allow single-word entities if they are known
function isAllowedSingleWord(norm, original) {
  // If it's in aliases → allowed
  if (ENTITY_ALIASES[norm]) return true;

  // If it's already in DB → allowed (resolver will match it)
  // We don't check DB here; matching happens later.

  // If it's a country-like name (capitalized, not generic)
  if (isProperNoun(original) && !GENERIC_NOUNS.has(norm)) {
    return true;
  }

  return false;
}

// Detect if a phrase looks like a real entity
function isValidEntityCandidate(text) {
  text = stripPossessive(text);
  text = stripTitle(text);

  const norm = normalizeString(text);

  if (!norm || norm.length < 3) return false;
  if (STOPWORDS.has(norm)) return false;
  if (GENERIC_NOUNS.has(norm)) return false;

  // Block media suffixes: "Israel Videos"
  const lastWord = norm.split(" ").slice(-1)[0];
  if (MEDIA_SUFFIXES.includes(lastWord)) return false;

  // Prevent "Hormuz Asia", "Kenya Africa", etc.
  const forbiddenSuffixes = ["asia", "africa", "europe", "america", "oceania"];
  if (forbiddenSuffixes.some(s => norm.endsWith(" " + s))) return false;

  const wordCount = text.trim().split(/\s+/).length;

  // Multi-word entities are valid
  if (wordCount >= 2) return true;

  // STRICT MODE: Single-word entities must be known
  return isAllowedSingleWord(norm, text);
}

function extractCandidates(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const candidates = new Set();

  // Multi-word chunks (capitalized sequences)
  const multiWordRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const multiMatches = text.match(multiWordRegex);
  if (multiMatches) {
    for (let m of multiMatches) {
      m = stripPossessive(m);
      m = stripTitle(m);
      if (isValidEntityCandidate(m)) candidates.add(m);
    }
  }

  // Single tokens
  for (let t of tokens) {
    t = stripPossessive(t);
    t = stripTitle(t);
    if (isValidEntityCandidate(t)) candidates.add(t);
  }

  return [...candidates];
}

async function resolveEntityForText(text, opts = { allowAutoCreate: true }) {
  if (!text || text.trim().length === 0) return null;

  // Normalize whitespace to avoid multi-line merges
  text = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

  const candidates = extractCandidates(text);

  if (candidates.length === 0) return null;

  // 1. Alias match
  for (const c of candidates) {
    const norm = normalizeString(c);
    const aliasSlug = ENTITY_ALIASES[norm] || ENTITY_ALIASES[c.toLowerCase()];
    if (aliasSlug) {
      const entity = await findEntityBySlug(aliasSlug);
      if (entity) return { ...entity, confidence: 0.95, created: false };
    }
  }

  // 2. Exact match
  for (const c of candidates) {
    const entity = await findEntityByExactName(c);
    if (entity) return { ...entity, confidence: 0.9, created: false };
  }

  // 3. Normalized match
  for (const c of candidates) {
    const norm = normalizeString(c);
    const entity = await findEntityByNormalizedName(norm);
    if (entity) return { ...entity, confidence: 0.85, created: false };
  }

  // 4. Strict auto-create
  if (opts.allowAutoCreate) {
    const best = candidates.find(c => isValidEntityCandidate(c));
    if (best) {
      const created = await createEntityFromName(best);
      return { ...created, confidence: 0.7, created: true };
    }
  }

  return null;
}

module.exports = { resolveEntityForText };
