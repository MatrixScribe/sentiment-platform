require("dotenv").config();
const { pool } = require("../db");

async function aggregateRedditDaily() {
  console.log("Reddit daily aggregation started...");

  await pool.query(`
    INSERT INTO reddit_daily_aggregates (
      date, total_posts, positive, negative, neutral, top_entities
    )
    SELECT
      CURRENT_DATE,
      COUNT(*),
      COUNT(*) FILTER (WHERE sentiment = 'positive'),
      COUNT(*) FILTER (WHERE sentiment = 'negative'),
      COUNT(*) FILTER (WHERE sentiment = 'neutral'),
      (
        SELECT json_agg(entity)
        FROM (
          SELECT jsonb_array_elements(entities) AS entity
          FROM reddit_posts
          WHERE created_at::date = CURRENT_DATE
        ) AS sub
      )
    FROM reddit_posts
    WHERE created_at::date = CURRENT_DATE
    ON CONFLICT (date)
    DO UPDATE SET
      total_posts = EXCLUDED.total_posts,
      positive = EXCLUDED.positive,
      negative = EXCLUDED.negative,
      neutral = EXCLUDED.neutral,
      top_entities = EXCLUDED.top_entities;
  `);

  console.log("Reddit daily aggregation finished.");
}

if (require.main === module) {
  aggregateRedditDaily().then(() => {
    console.log("Done.");
    process.exit(0);
  });
}

module.exports = { runRedditDailyAggregation: aggregateRedditDaily };
