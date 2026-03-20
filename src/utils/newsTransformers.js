// src/utils/newsTransformers.js

// ---------------- SENTIMENT TREND (Line Chart) ----------------
function newsSentimentTrendTransform(rows) {
  return {
    labels: rows.map(r => r.date),
    positive: rows.map(r => r.positive),
    negative: rows.map(r => r.negative),
    neutral: rows.map(r => r.neutral)
  };
}

// ---------------- TOP ENTITIES (Bar Chart / Word Cloud) ----------------
function newsTopEntitiesTransform(rows) {
  if (!rows || rows.length === 0) return [];
  const latest = rows[0]; // most recent day
  return latest.top_entities || [];
}

// ---------------- SOURCE COMPARISON (Stacked Bar) ----------------
function newsSourceComparisonTransform(rows) {
  return rows.map(r => ({
    source: r.source,
    positive: r.positive,
    negative: r.negative,
    neutral: r.neutral
  }));
}

// ---------------- DAILY SUMMARY CARDS ----------------
function newsDailySummaryTransform(rows) {
  return rows.map(r => ({
    source: r.source,
    total_articles: r.total_articles,
    positive: r.positive,
    negative: r.negative,
    neutral: r.neutral,
    top_entities: r.top_entities
  }));
}

module.exports = {
  newsSentimentTrendTransform,
  newsTopEntitiesTransform,
  newsSourceComparisonTransform,
  newsDailySummaryTransform
};
