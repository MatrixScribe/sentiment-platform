require("dotenv").config();
const db = require("../db");
const { resolveEntityForText } = require("../lib/entities/entityResolver");

(async () => {
  try {
    console.log("🔍 Fetching posts without entity assignment...");
    const posts = await db.getPostsWithoutEntity();

    console.log(`📌 Found ${posts.length} posts to process.\n`);

    for (const post of posts) {
      console.log(`➡️ Processing Post ID: ${post.id}`);

      const match = await resolveEntityForText(post.content || "");

      if (!match) {
        console.log(`   ⚠️ No entity detected.`);
        continue;
      }

      console.log(
        `   ${match.created ? "🆕 Created new entity" : "✅ Matched entity"}: ${match.name} (ID: ${match.id})`
      );

      await db.updatePostEntity(post.id, match.id);
    }

    console.log("\n🎉 Entity reassignment complete.");
    process.exit();

  } catch (err) {
    console.error("❌ Error during entity reassignment:", err);
    process.exit(1);
  }
})();
