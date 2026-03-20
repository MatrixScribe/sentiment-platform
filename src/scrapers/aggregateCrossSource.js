require("dotenv").config();
const { pool } = require("../db");

// ---------------- FETCH DAILY REDDIT SUMMARY ----------------
async function getRedditDaily(date) {
  const res = await pool.query(
    `
    SELECT subreddit, positive, negative, neutral, top_entities
    FROM reddit_daily_summary
    WHERE date = $1
    `,
    [date]
  );
  return res.rows;
}

// ---------------- FETCH DAILY NEWS SUMMARY ----------------
async function getNewsDaily(date) {
  const res = await pool.query(
    `
    SELECT source, positive, negative, neutral, top_entities
    FROM news_daily_summary
    WHERE date = $1
    `,
    [date]
  );
  return res.rows;
}

// ---------------- SENTIMENT DIVERGENCE SCORE ----------------
// Simple formula: difference in negative sentiment weighted more heavily
function computeDivergence(reddit, news) {
  const rNeg = reddit.negative || 0;
  const nNeg = news.negative || 0;

  const rPos = reddit.positive || 0;
  const nPos = news.positive || 0;

  const negDiff = Math.abs(rNeg - nNeg);
  const posDiff = Math.abs(rPos - nPos);

  return negDiff * 1.5 + posDiff * 1.0;
}

// ---------------- ENTITY OVERLAP ----------------
function extractEntitySets(redditEntities, newsEntities) {
  const rSet = new Set(redditEntities.map(e => e.value.toLowerCase()));
  const nSet = new Set(newsEntities.map(e => e.value.toLowerCase()));

  const shared = [...rSet].filter(x => nSet.has(x));
  const rOnly = [...rSet].filter(x => !nSet.has(x));
  const nOnly = [...nSet].filter(x => !rSet.has(x));

  return { shared, rOnly, nOnly };
}

// ---------------- SAVE CROSS-SOURCE SUMMARY ----------------
async function saveCrossSource(date, summary) {
  await pool.query(
    `
    INSERT INTO cross_source_daily (
      date,
      reddit_positive, reddit_negative, reddit_neutral,
      news_positive, news_negative, news_neutral,
      sentiment_divergence_score,
      reddit_top_entities, news_top_entities,
      shared_entities, reddit_unique_entities, news_unique_entities
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `,
    [
      date,
      summary.reddit_positive,
      summary.reddit_negative,
      summary.reddit_neutral,
      summary.news_positive,
      summary.news_negative,
      summary.news_neutral,
      summary.sentiment_divergence_score,
      JSON.stringify(summary.reddit_top_entities),
      JSON.stringify(summary.news_top_entities),
      JSON.stringify(summary.shared_entities),
      JSON.stringify(summary.reddit_unique_entities),
      JSON.stringify(summary.news_unique_entities)
    ]
  );
}

// ---------------- MAIN AGGREGATION ----------------
async function runCrossSourceAggregation() {
  const today = new Date().toISOString().slice(0, 10);
  console.log("Running cross-source aggregation for:", today);

  const reddit = await getRedditDaily(today);
  const news = await getNewsDaily(today);

  if (reddit.length === 0 || news.length === 0) {
    console.log("Not enough data for cross-source aggregation.");
    return;
  }

  // Combine all Reddit sentiment
  const redditTotals = reddit.reduce(
    (acc, r) => ({
      positive: acc.positive + r.positive,
      negative: acc.negative + r.negative,
      neutral: acc.neutral + r.neutral,
      entities: acc.entities.concat(r.top_entities || [])
    }),
    { positive: 0, negative: 0, neutral: 0, entities: [] }
  );

  // Combine all News sentiment
  const newsTotals = news.reduce(
    (acc, n) => ({
      positive: acc.positive + n.positive,
      negative: acc.negative + n.negative,
      neutral: acc.neutral + n.neutral,
      entities: acc.entities.concat(n.top_entities || [])
    }),
    { positive: 0, negative: 0, neutral: 0, entities: [] }
  );

  const divergence = computeDivergence(redditTotals, newsTotals);
  const { shared, rOnly, nOnly } = extractEntitySets(
    redditTotals.entities,
    newsTotals.entities
  );

  const summary = {
    reddit_positive: redditTotals.positive,
    reddit_negative: redditTotals.negative,
    reddit_neutral: redditTotals.neutral,

    news_positive: newsTotals.positive,
    news_negative: newsTotals.negative,
    news_neutral: newsTotals.neutral,

    sentiment_divergence_score: divergence,

    reddit_top_entities: redditTotals.entities,
    news_top_entities: newsTotals.entities,

    shared_entities: shared,
    reddit_unique_entities: rOnly,
    news_unique_entities: nOnly
  };

  await saveCrossSource(today, summary);

  console.log("Cross-source aggregation complete.");
}

if (require.main === module) {
  runCrossSourceAggregation().then(() => process.exit(0));
}

module.exports = { runCrossSourceAggregation };
