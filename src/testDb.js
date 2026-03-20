const pool = require('./db/db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
  } catch (err) {
    console.error('DB connection error:', err);
  }
}

testConnection();
