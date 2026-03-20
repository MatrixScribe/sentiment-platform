// scrapers/redditScraper.js
const axios = require("axios");
const { pool } = require("../db");   // <-- use your existing DB pool

const SUBREDDITS = ["worldnews", "politics", "africa", "middleeast"]; 
const LIMIT = 50; // posts per subreddit per run

async function fetchSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${LIMIT}`;
  const res = await axios.get(url, {
    headers: { "User-Agent": "MatrixScribeBot/1.0" },
  });
  return res.data.data.children.map((c) => c.data);
}

async function savePost(post, subreddit) {
  const query = `
    INSERT INTO reddit_posts (
      reddit_id, subreddit, title, content, author, url,
      score, num_comments, created_utc
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TO_TIMESTAMP($9))
    ON CONFLICT (reddit_id) DO NOTHING;
  `;

  const values = [
    post.id,
    subreddit,
    post.title || "",
    post.selftext || "",
    post.author || "",
    `https://reddit.com${post.permalink}`,
    post.score || 0,
    post.num_comments || 0,
    post.created_utc,
  ];

  await pool.query(query, values);
}

async function runRedditScraper() {
  console.log("Reddit scraper started...");

  for (const subreddit of SUBREDDITS) {
    try {
      console.log(`Fetching /r/${subreddit}...`);
      const posts = await fetchSubreddit(subreddit);

      for (const post of posts) {
        await savePost(post, subreddit);
      }

      console.log(`Saved ${posts.length} posts from /r/${subreddit}`);
    } catch (err) {
      console.error(`Error scraping /r/${subreddit}:`, err.message);
    }
  }

  console.log("Reddit scraper finished.");
}

module.exports = { runRedditScraper };
