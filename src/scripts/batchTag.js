console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("DATABASE_URL =", process.env.DATABASE_URL);
const db = require("../db");
const { tagPost } = require("../tagging/tagger");

(async () => {
  const posts = await db.pool.query(
    `SELECT id, content FROM posts WHERE entity_id IS NULL LIMIT 200`
  );

  console.log(`Tagging ${posts.rows.length} posts...`);

  for (const post of posts.rows) {
    await tagPost(post);
  }

  console.log("Batch tagging complete.");
  process.exit(0);
})();
