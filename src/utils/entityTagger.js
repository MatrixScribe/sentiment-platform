const db = require("../db");

const ENTITY_KEYWORDS = {
  sarb: [
    "sarb",
    "reserve bank",
    "south african reserve bank",
    "repo rate",
    "interest rate",
    "kganyago",
    "monetary policy"
  ],
  eskom: [
    "eskom",
    "load shedding",
    "loadshedding",
    "power utility",
    "megawatt park",
    "electricity crisis"
  ],
  transnet: [
    "transnet",
    "rail freight",
    "ports",
    "durban port",
    "freight rail"
  ],
  anc: [
    "anc",
    "african national congress",
    "luthuli house",
    "ruling party"
  ],
  mtn: [
    "mtn",
    "telecoms",
    "mobile operator",
    "network provider"
  ],
  "standard-bank": [
    "standard bank",
    "stanbic",
    "banking group"
  ],
  presidency: [
    "presidency",
    "president ramaphosa",
    "union buildings",
    "the president"
  ]
};

async function tagEntityForPost(postId, content) {
  const lower = content.toLowerCase();

  for (const slug of Object.keys(ENTITY_KEYWORDS)) {
    const keywords = ENTITY_KEYWORDS[slug];

    if (keywords.some(k => lower.includes(k))) {
      const entity = await db.pool.query(
        `SELECT id FROM entities WHERE slug = $1`,
        [slug]
      );

      if (entity.rows.length > 0) {
        await db.pool.query(
          `UPDATE posts SET entity_id = $1 WHERE id = $2`,
          [entity.rows[0].id, postId]
        );
        return slug;
      }
    }
  }

  return null;
}

module.exports = tagEntityForPost;
