require("dotenv").config();
const { pool } = require("../db");

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

async function getProcessedPostsForWeek(weekStart) {
  const res = await pool.query(
    `
    SELECT subreddit, sentiment, entities
    FROM reddit_posts
    WHERE processed = true
    AND DATE(created_at) >= $1
    AND DATE(created_at) < $1::date + INTERVAL '7 days'
    `,
    [weekStart]
  );
  return res.rows;
}

function countSentiment(posts) {
  let positive = 0, negative = 0, neutral = 0;

  for (const p of posts) {
    if (p.sentiment === "positive") positive++;
    else if (p.sentiment === "negative") negative++;
    else neutral++;
  }

  return { positive, negative, neutral };
}

function extractTopEntities(posts, limit = 10) {
  const freq = {};

  for (const p of posts) {
    if (!p.entities) continue;

    for (const e of p.entities) {
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

async function saveWeeklySummary(weekStart, subreddit, summary) {
  await pool.query(
    `
    INSERT INTO reddit_weekly_summary (
      week_start, subreddit, total_posts, positive, negative, neutral, top_entities
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      weekStart,
      subreddit,
      summary.total_posts,
      summary.positive,
      summary.negative,
      summary.neutral,
      JSON.stringify(summary.top_entities)
    ]
  );
}

async function runWeeklyAggregation() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart(today);

  console.log("Running weekly aggregation for week starting:", weekStart);

  const posts = await getProcessedPostsForWeek(weekStart);

  const grouped = {};

  for (const p of posts) {
    if (!grouped[p.subreddit]) grouped[p.subreddit] = [];
    grouped[p.subreddit].push(p);
  }

  for (const subreddit of Object.keys(grouped)) {
    const list = grouped[subreddit];

    const { positive, negative, neutral } = countSentiment(list);
    const top_entities = extractTopEntities(list, 10);

    const summary = {
      total_posts: list.length,
      positive,
      negative,
      neutral,
      top_entities
    };

    await saveWeeklySummary(weekStart, subreddit, summary);

    console.log(`Saved weekly summary for /r/${subreddit}`);
  }

  console.log("Weekly aggregation complete.");
}

if (require.main === module) {
  runWeeklyAggregation().then(() => process.exit(0));
}

module.exports = { runWeeklyAggregation };
