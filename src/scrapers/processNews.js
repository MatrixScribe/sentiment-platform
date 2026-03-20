require("dotenv").config();
const { pool } = require("../db");
const { analyzeText } = require("../services/nlpService");

async function getUnprocessedNewsArticles(limit = 100) {
  const res = await pool.query(
    `
    SELECT *
    FROM news_articles
    WHERE processed = false
    ORDER BY published_at ASC
    LIMIT $1
    `,
    [limit]
  );
  return res.rows;
}

async function processNewsArticle(article) {
  const text = `${article.title}\n\n${article.content || ""}`.trim();
  if (!text) return;

  const { sentiment, score, entities } = await analyzeText(text);

  await pool.query(
    `
    UPDATE news_articles
    SET sentiment = $1,
        sentiment_score = $2,
        entities = $3,
        processed = true
    WHERE id = $4
    `,
    [sentiment, score, JSON.stringify(entities), article.id]
  );
}

async function runNewsProcessing() {
  console.log("News processing started...");

  const articles = await getUnprocessedNewsArticles();

  console.log(`Found ${articles.length} unprocessed news articles`);

  for (const article of articles) {
    try {
      await processNewsArticle(article);
      console.log(`Processed news_article id=${article.id} (${article.source})`);
    } catch (err) {
      console.error(`Error processing news_article id=${article.id}:`, err.message);
    }
  }

  console.log("News processing finished.");
}

if (require.main === module) {
  runNewsProcessing().then(() => {
    console.log("Done.");
    process.exit(0);
  });
}

// ⭐ FIXED EXPORT — matches what dailyCron.js expects
module.exports = { runNewsProcessor: runNewsProcessing };
