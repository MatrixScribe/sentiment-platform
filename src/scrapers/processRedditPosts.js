require("dotenv").config();
const { pool } = require("../db");
const { analyzeText } = require("../services/nlpService");

const BATCH_SIZE = 100;

async function getUnprocessedRedditPosts(limit = BATCH_SIZE) {
  const res = await pool.query(
    `
    SELECT *
    FROM reddit_posts
    WHERE processed = false
    ORDER BY created_at ASC
    LIMIT $1
    `,
    [limit]
  );
  return res.rows;
}

async function processRedditPost(post) {
  const text = `${post.title}\n\n${post.content || ""}`.trim();
  if (!text) return;

  const { sentiment, score, entities } = await analyzeText(text);

  await pool.query(
    `
    UPDATE reddit_posts
    SET sentiment = $1,
        sentiment_score = $2,
        entities = $3,
        processed = true
    WHERE id = $4
    `,
    [sentiment, score, JSON.stringify(entities), post.id]
  );
}

async function runRedditProcessing() {
  console.log("Reddit processing started...");

  const posts = await getUnprocessedRedditPosts();

  console.log(`Found ${posts.length} unprocessed posts`);

  for (const post of posts) {
    try {
      await processRedditPost(post);
      console.log(`Processed reddit_post id=${post.id} (${post.subreddit})`);
    } catch (err) {
      console.error(`Error processing reddit_post id=${post.id}:`, err.message);
    }
  }

  console.log("Reddit processing finished.");
}

if (require.main === module) {
  runRedditProcessing().then(() => {
    console.log("Done.");
    process.exit(0);
  });
}

// ⭐ FIXED EXPORT — matches what dailyCron.js expects
module.exports = { runRedditProcessor: runRedditProcessing };
