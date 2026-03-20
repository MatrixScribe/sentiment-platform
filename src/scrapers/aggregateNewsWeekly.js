require("dotenv").config();
const { pool } = require("../db");

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

async function getProcessedNewsForWeek(weekStart) {
  const res = await pool.query(
    `
    SELECT source, sentiment, entities
    FROM news_articles
    WHERE processed = true
    AND DATE(published_at) >= $1
    AND DATE(published_at) < $1::date + INTERVAL '7 days'
    `,
    [weekStart]
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

async function saveWeeklySummary(weekStart, source, summary) {
  await pool.query(
    `
    INSERT INTO news_weekly_summary (
      week_start, source, total_articles, positive, negative, neutral, top_entities
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      weekStart,
      source,
      summary.total_articles,
      summary.positive,
      summary.negative,
      summary.neutral,
      JSON.stringify(summary.top_entities)
    ]
  );
}

async function runNewsWeeklyAggregation() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart(today);

  console.log("Running weekly news aggregation for week starting:", weekStart);

  const articles = await getProcessedNewsForWeek(weekStart);

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

    await saveWeeklySummary(weekStart, source, summary);

    console.log(`Saved weekly news summary for ${source}`);
  }

  console.log("Weekly news aggregation complete.");
}

if (require.main === module) {
  runNewsWeeklyAggregation().then(() => process.exit(0));
}

module.exports = { runNewsWeeklyAggregation };
