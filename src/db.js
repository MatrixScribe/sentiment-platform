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

  // ---------------- USERS ----------------

  async getUserByEmail(email) {
    const res = await pool.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return res.rows[0];
  },

  async createUser(email, passwordHash, tenantId) {
    const res = await pool.query(
      `
      INSERT INTO users (email, password_hash, tenant_id)
      VALUES ($1, $2, $3)
      RETURNING id, email, tenant_id, created_at
      `,
      [email, passwordHash, tenantId]
    );
    return res.rows[0];
  },

  async getUserById(id) {
    const res = await pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0];
  },

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
