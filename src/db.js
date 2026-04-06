// src/db.js
const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

let pool;

if (isProduction && process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sentiment_db",
    ssl: false
  });
}

module.exports = {
  pool,

  // ---------------- POSTS ----------------

  async getPostById(id, tenantId) {
    const res = await pool.query(
      `SELECT * FROM posts WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return res.rows[0];
  },

  async getUnprocessedPosts(tenantId) {
    const res = await pool.query(`
      SELECT p.*
      FROM posts p
      LEFT JOIN sentiment_scores s ON p.id = s.post_id
      WHERE s.post_id IS NULL
      AND p.tenant_id = $1
      ORDER BY p.id ASC
    `, [tenantId]);
    return res.rows;
  },

  async insertSentimentResult(postId, result, tenantId) {
    const { sentiment, score } = result;
    await pool.query(
      `INSERT INTO sentiment_scores (post_id, sentiment, score, tenant_id)
       VALUES ($1, $2, $3, $4)`,
      [postId, sentiment, score, tenantId]
    );
  },

  async insertPostTopics(postId, topics, tenantId) {
    for (const topic of topics) {
      const existing = await pool.query(
        'SELECT id FROM topics WHERE name = $1',
        [topic]
      );

      let topicId;

      if (existing.rows.length > 0) {
        topicId = existing.rows[0].id;
      } else {
        const insert = await pool.query(
          'INSERT INTO topics (name) VALUES ($1) RETURNING id',
          [topic]
        );
        topicId = insert.rows[0].id;
      }

      await pool.query(
        `INSERT INTO post_topics (post_id, topic_id, tenant_id)
         VALUES ($1, $2, $3)`,
        [postId, topicId, tenantId]
      );
    }
  },

  // ---------------- ANALYTICS HELPERS ----------------

  async getSentimentSummary(tenantId) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral,
        AVG(score) AS average_score
      FROM sentiment_scores
      WHERE tenant_id = $1
    `, [tenantId]);

    return result.rows[0];
  },

  async getTrendingTopics(tenantId) {
    const result = await pool.query(`
      SELECT 
        t.name AS topic,
        COUNT(pt.post_id) AS count
      FROM topics t
      JOIN post_topics pt ON t.id = pt.topic_id
      JOIN posts p ON p.id = pt.post_id
      WHERE p.tenant_id = $1
      GROUP BY t.name
      ORDER BY count DESC;
    `, [tenantId]);

    return result.rows;
  },

  async getSentimentByTopic(tenantId) {
    const result = await pool.query(`
      SELECT 
        t.name AS topic,
        s.sentiment,
        COUNT(*) AS count
      FROM topics t
      JOIN post_topics pt ON t.id = pt.topic_id
      JOIN sentiment_scores s ON pt.post_id = s.post_id
      JOIN posts p ON p.id = pt.post_id
      WHERE p.tenant_id = $1
      GROUP BY t.name, s.sentiment
      ORDER BY t.name ASC;
    `, [tenantId]);

    return result.rows;
  },

  async getPostDetails(postId, tenantId) {
    const post = await pool.query(
      `SELECT * FROM posts WHERE id = $1 AND tenant_id = $2`,
      [postId, tenantId]
    );

    if (post.rows.length === 0) return null;

    const sentiment = await pool.query(
      `SELECT sentiment, score 
       FROM sentiment_scores 
       WHERE post_id = $1 AND tenant_id = $2`,
      [postId, tenantId]
    );

    const topics = await pool.query(
      `SELECT t.name 
       FROM topics t
       JOIN post_topics pt ON t.id = pt.topic_id
       JOIN posts p ON p.id = pt.post_id
       WHERE pt.post_id = $1 AND p.tenant_id = $2`,
      [postId, tenantId]
    );

    return {
      post: post.rows[0],
      sentiment: sentiment.rows[0] || null,
      topics: topics.rows.map(t => t.name)
    };
  },

  // ---------------- AUTH HELPERS ----------------

  async createUser(email, passwordHash, tenantId) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, tenant_id)
       VALUES ($1, $2, $3)
       RETURNING id, email, tenant_id, created_at`,
      [email, passwordHash, tenantId]
    );
    return res.rows[0];
  },

  async getUserByEmail(email) {
    const res = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return res.rows[0];
  },

  async getUserById(id) {
    const res = await pool.query(
      `SELECT id, email, tenant_id, created_at FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0];
  },

  // ---------------- ENTITY HELPERS ----------------

  async getAllEntities() {
    const res = await pool.query(`SELECT id, slug, name FROM entities`);
    return res.rows;
  },

  async getAllEntitiesWithDescriptions() {
    const res = await pool.query(`
      SELECT id, name, slug, description
      FROM entities
    `);
    return res.rows;
  },

  async getPostsWithoutEntity() {
    const res = await pool.query(`
      SELECT id, content
      FROM posts
      WHERE entity_id IS NULL
    `);
    return res.rows;
  },

  async updatePostEntity(postId, entityId) {
    await pool.query(
      `UPDATE posts SET entity_id = $1 WHERE id = $2`,
      [entityId, postId]
    );
  }
};
