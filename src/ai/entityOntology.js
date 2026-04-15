// ai/entityOntology.js

const COUNTRY_KEYWORDS = ["republic", "federation", "kingdom"];
const ORG_KEYWORDS = ["organization", "organisation", "union", "council", "committee"];
const COMPANY_SUFFIXES = ["inc", "ltd", "corp", "gmbh", "sa", "plc", "pty", "llc"];
const PERSON_PATTERN = /\s/;

function classifyEntityType(name) {
  if (!name) return "unknown";
  const n = name.toLowerCase().trim();

  if (COUNTRY_KEYWORDS.some(k => n.includes(k))) return "country";
  if (ORG_KEYWORDS.some(k => n.includes(k))) return "organisation";
  if (COMPANY_SUFFIXES.some(s => n.endsWith(` ${s}`))) return "company";
  if (PERSON_PATTERN.test(n)) return "person";

  return "unknown";
}

function canonicalizeEntityName(name) {
  if (!name) return null;
  return name.trim();
}

function extractAliases(name) {
  if (!name) return [];
  return [name.trim()];
}

function enrichMetadata(name, type) {
  return {
    type_hint: type || "unknown",
    source: "auto",
  };
}

module.exports = {
  classifyEntityType,
  canonicalizeEntityName,
  extractAliases,
  enrichMetadata,
};
