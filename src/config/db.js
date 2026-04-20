import pkg from 'pg';
const { Pool } = pkg;

import { ENV } from './env.js';

export const db = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
