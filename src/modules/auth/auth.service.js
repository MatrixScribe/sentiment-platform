import bcrypt from 'bcryptjs';
import { db } from '../../config/db.js';

export async function createUser({ email, password, countryCode }) {
  // Check if user exists
  const existing = await db.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (existing.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const hash = await bcrypt.hash(password, 10);

  // Create user
  const userRes = await db.query(
    `INSERT INTO users (email, password_hash, country_code)
     VALUES ($1, $2, $3)
     RETURNING id, email, country_code`,
    [email, hash, countryCode]
  );

  const user = userRes.rows[0];

  // Auto-create wallet
  await db.query(
    `INSERT INTO wallets (user_id, currency, balance)
     VALUES ($1, 'USD', 0)`,
    [user.id]
  );

  return user;
}

export async function authenticateUser(email, password) {
  const userRes = await db.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (userRes.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = userRes.rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    country_code: user.country_code
  };
}
