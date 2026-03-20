// src/utils/crossSourceTransformers.js

// ---------------- DAILY SUMMARY (cards / tables) ----------------
function crossSourceDailyTransform(rows) {
  return rows.map(r => ({
    date: r.date,
    reddit: {
      positive: r.reddit_positive,
      negative: r.reddit_negative,
      neutral: r.reddit_neutral
    },
    news: {
      positive: r.news_positive,
      negative: r.news_negative,
      neutral: r.news_neutral
    },
    sentiment_divergence_score: Number(r.sentiment_divergence_score || 0),
    reddit_top_entities: r.reddit_top_entities || [],
    news_top_entities: r.news_top_entities || []
  }));
}

// ---------------- DIVERGENCE TREND (line chart) ----------------
function crossSourceDivergenceTrendTransform(rows) {
  return {
    labels: rows.map(r => r.date),
    divergence: rows.map(r => Number(r.sentiment_divergence_score || 0))
  };
}

// ---------------- ENTITY OVERLAP (for Venn / lists) ----------------
function crossSourceEntitiesTransform(rows) {
  return rows.map(r => ({
    date: r.date,
    shared_entities: r.shared_entities || [],
    reddit_unique_entities: r.reddit_unique_entities || [],
    news_unique_entities: r.news_unique_entities || []
  }));
}

// ---------------- ALERTS (cards / list) ----------------
function crossSourceAlertsTransform(rows) {
  return rows
    .map(r => {
      const sharedCount = (r.shared_entities || []).length;
      const redditOnly = (r.reddit_unique_entities || []).length;
      const newsOnly = (r.news_unique_entities || []).length;
      const divergence = Number(r.sentiment_divergence_score || 0);

      const highDivergence = divergence > 20;
      const lowOverlap = sharedCount < 3;
      const asymmetricNarrative = redditOnly > 5 || newsOnly > 5;

      const triggered =
        highDivergence || lowOverlap || asymmetricNarrative;

      return {
        date: r.date,
        divergence,
        sharedCount,
        redditOnly,
        newsOnly,
        triggered,
        reasons: {
          highDivergence,
          lowOverlap,
          asymmetricNarrative
        }
      };
    })
    .filter(a => a.triggered);
}

module.exports = {
  crossSourceDailyTransform,
  crossSourceDivergenceTrendTransform,
  crossSourceEntitiesTransform,
  crossSourceAlertsTransform
};
