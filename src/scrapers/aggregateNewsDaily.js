require("dotenv").config();
const { pool } = require("../db");

async function getProcessedNewsForDate(date) {
  const res = await pool.query(
    `
    SELECT source, sentiment, entities
    FROM news_articles
    WHERE processed = true
    AND DATE(published_at) = $1
    `,
    [date]
  );
  return res.rows;
}

function countSentiment(articles) {
  let positive = 0, negative = 0, neutral = 0;

  for (const a of articles) {
    if (a.sentiment === "positive") positive++;
    else if (a.sentiment === "negative") negative++;
    else neutral++;
  }

  return { positive, negative, neutral };
}

function extractTopEntities(articles, limit = 10) {
  const freq = {};

  for (const a of articles) {
    if (!a.entities) continue;

    for (const e of a.entities) {
      const key = `${e.type}:${e.value}`;
      freq[key] = (freq[key] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [type, value] = key.split(":");
      return { type, value, count };
    });
}

async function saveDailySummary(date, source, summary) {
  await pool.query(
    `
    INSERT INTO news_daily_summary (
      date, source, total_articles, positive, negative, neutral, top_entities
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      date,
      source,
      summary.total_articles,
      summary.positive,
      summary.negative,
      summary.neutral,
      JSON.stringify(summary.top_entities)
    ]
  );
}

async function runNewsDailyAggregation() {
  const today = new Date().toISOString().slice(0, 10);
  console.log("Running daily news aggregation for:", today);

  const articles = await getProcessedNewsForDate(today);

  const grouped = {};

  for (const a of articles) {
    if (!grouped[a.source]) grouped[a.source] = [];
    grouped[a.source].push(a);
  }

  for (const source of Object.keys(grouped)) {
    const list = grouped[source];

    const { positive, negative, neutral } = countSentiment(list);
    const top_entities = extractTopEntities(list, 10);

    const summary = {
      total_articles: list.length,
      positive,
      negative,
      neutral,
      top_entities
    };

    await saveDailySummary(today, source, summary);

    console.log(`Saved daily news summary for ${source}`);
  }

  console.log("Daily news aggregation complete.");
}

if (require.main === module) {
  runNewsDailyAggregation().then(() => process.exit(0));
}

module.exports = { runNewsDailyAggregation };
