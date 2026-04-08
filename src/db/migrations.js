// src/db/migrations.js
const { pool } = require("./index");

async function runMigrations() {
  console.log("🔧 Running DB migrations...");

  // -------------------------------
  // ENTITIES TABLE
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT,
      region TEXT,
      description TEXT,
      normalized_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_entities_slug
    ON entities(slug);
  `);

  // -------------------------------
  // POSTS TABLE
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      external_id TEXT,
      source TEXT,
      source_id INTEGER,
      content TEXT,
      content_hash TEXT UNIQUE,
      entity_id INTEGER REFERENCES entities(id),
      entity_type TEXT,
      entity_confidence NUMERIC,
      tenant_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_post_source
    ON posts(external_id, source);
  `);

  // -------------------------------
  // SENTIMENT SCORES
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sentiment_scores (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      sentiment TEXT,
      score NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sentiment_post
    ON sentiment_scores(post_id);
  `);

  // -------------------------------
  // TOPICS
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_topics (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      topic_id INTEGER REFERENCES topics(id),
      tenant_id TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_topics_post
    ON post_topics(post_id);
  `);

  // -------------------------------
  // TAGS
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_tags (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      tag TEXT,
      tenant_id TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_tags_post
    ON post_tags(post_id);
  `);

  // -------------------------------
  // INSIGHTS
  // -------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS insights (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT,
      date DATE,
      topics JSONB,
      sentiment_trend TEXT,
      summary TEXT
    );
  `);

  console.log("✅ DB migrations complete.");
}

module.exports = { runMigrations };
