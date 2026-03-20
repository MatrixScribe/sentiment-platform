// src/utils/redditTransformers.js

// ---------------- SENTIMENT TREND (Line Chart) ----------------
function sentimentTrendTransform(rows) {
  return {
    labels: rows.map(r => r.date),
    positive: rows.map(r => r.positive),
    negative: rows.map(r => r.negative),
    neutral: rows.map(r => r.neutral)
  };
}

// ---------------- TOP ENTITIES (Bar Chart / Word Cloud) ----------------
function topEntitiesTransform(rows) {
  if (!rows || rows.length === 0) return [];
  const latest = rows[0]; // most recent day
  return latest.top_entities || [];
}

// ---------------- SUBREDDIT COMPARISON (Stacked Bar) ----------------
function subredditComparisonTransform(rows) {
  return rows.map(r => ({
    subreddit: r.subreddit,
    positive: r.positive,
    negative: r.negative,
    neutral: r.neutral
  }));
}

// ---------------- DAILY SUMMARY CARDS ----------------
function dailySummaryTransform(rows) {
  return rows.map(r => ({
    subreddit: r.subreddit,
    total_posts: r.total_posts,
    positive: r.positive,
    negative: r.negative,
    neutral: r.neutral,
    top_entities: r.top_entities
  }));
}

module.exports = {
  sentimentTrendTransform,
  topEntitiesTransform,
  subredditComparisonTransform,
  dailySummaryTransform
};
