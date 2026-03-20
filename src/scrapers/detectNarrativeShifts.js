require("dotenv").config();
const { pool } = require("../db");

// ---------------- FETCH LAST 7 DAYS ----------------
async function getLast7Days() {
  const res = await pool.query(`
    SELECT *
    FROM cross_source_daily
    ORDER BY date DESC
    LIMIT 7
  `);
  return res.rows.reverse(); // oldest → newest
}

// ---------------- RATE OF CHANGE ----------------
function rateOfChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ---------------- ENTITY VELOCITY ----------------
function computeEntityVelocity(todayEntities, yesterdayEntities) {
  const todaySet = new Set(todayEntities.map(e => e.toLowerCase()));
  const yesterdaySet = new Set(yesterdayEntities.map(e => e.toLowerCase()));

  const newEntities = [...todaySet].filter(x => !yesterdaySet.has(x));
  const droppedEntities = [...yesterdaySet].filter(x => !todaySet.has(x));

  return { newEntities, droppedEntities };
}

// ---------------- MAIN DETECTION ----------------
async function runNarrativeShiftDetection() {
  console.log("Running Narrative Shift Detection...");

  const rows = await getLast7Days();
  if (rows.length < 2) {
    console.log("Not enough data for shift detection.");
    return;
  }

  const today = rows[rows.length - 1];
  const yesterday = rows[rows.length - 2];

  // Sentiment divergence spike
  const divergenceSpike = rateOfChange(
    today.sentiment_divergence_score,
    yesterday.sentiment_divergence_score
  );

  // Entity overlap drop
  const overlapDrop = rateOfChange(
    (today.shared_entities || []).length,
    (yesterday.shared_entities || []).length
  );

  // Entity velocity
  const redditVelocity = computeEntityVelocity(
    today.reddit_unique_entities || [],
    yesterday.reddit_unique_entities || []
  );

  const newsVelocity = computeEntityVelocity(
    today.news_unique_entities || [],
    yesterday.news_unique_entities || []
  );

  const shift = {
    date: today.date,
    divergenceSpike,
    overlapDrop,
    redditNewEntities: redditVelocity.newEntities,
    redditDroppedEntities: redditVelocity.droppedEntities,
    newsNewEntities: newsVelocity.newEntities,
    newsDroppedEntities: newsVelocity.droppedEntities
  };

  console.log("Narrative Shift:", shift);
  return shift;
}

if (require.main === module) {
  runNarrativeShiftDetection().then(() => process.exit(0));
}

module.exports = { runNarrativeShiftDetection };
