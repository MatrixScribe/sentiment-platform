require("dotenv").config();
const Parser = require("rss-parser");
const parser = new Parser();
const { pool } = require("../db");
const crypto = require("crypto");

const FEEDS = [
  // World
  { source: "Reuters World", url: "https://www.reuters.com/rssFeed/worldNews" },
  { source: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "AP World", url: "https://apnews.com/rss" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },

  // Africa
  { source: "AfricaNews", url: "https://www.africanews.com/feed/" },
  { source: "BBC Africa", url: "http://feeds.bbci.co.uk/news/world/africa/rss.xml" },

  // Middle East
  { source: "Reuters Middle East", url: "https://www.reuters.com/rssFeed/middleEastNews" },
  { source: "BBC Middle East", url: "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml" }
];

function generateNewsId(title, url) {
  return crypto.createHash("sha256").update(title + url).digest("hex");
}

async function saveArticle(article, source) {
  const news_id = generateNewsId(article.title, article.link);

  await pool.query(
    `
    INSERT INTO news_articles
    (news_id, source, title, summary, url, published_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (news_id) DO NOTHING
    `,
    [
      news_id,
      source,
      article.title,
      article.contentSnippet || "",
      article.link,
      article.isoDate || new Date()
    ]
  );
}

async function scrapeFeed(feed) {
  console.log(`Fetching: ${feed.source}`);

  try {
    const data = await parser.parseURL(feed.url);

    for (const item of data.items) {
      await saveArticle(item, feed.source);
    }

    console.log(`Saved articles from ${feed.source}`);
  } catch (err) {
    console.error(`Error fetching ${feed.source}:`, err.message);
  }
}

async function runNewsScraper() {
  console.log("News scraper started...");

  for (const feed of FEEDS) {
    await scrapeFeed(feed);
  }

  console.log("News scraper finished.");
}

if (require.main === module) {
  runNewsScraper().then(() => process.exit(0));
}

module.exports = { runNewsScraper };
