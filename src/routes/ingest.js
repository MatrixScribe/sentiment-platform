const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.post('/social', async (req, res) => {
  try {
    const { platform, content, author, region, language, posted_at, metadata } = req.body;

    const result = await pool.query(
      `INSERT INTO posts_raw (platform, content, author, region, language, posted_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [platform, content, author, region, language, posted_at, metadata]
    );

    res.status(201).json({ success: true, post_id: result.rows[0].id });
  } catch (err) {
    console.error('Error inserting post:', err);
    res.status(500).json({ success: false, error: 'Database insert failed' });
  }
});

module.exports = router;
