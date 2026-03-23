// routes/dbTest.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    res.json({
      status: 'success',
      message: 'Database connection is working',
      time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
