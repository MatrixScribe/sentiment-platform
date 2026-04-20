import { db } from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';

export async function adminLogin(req, res) {
  const { email, password } = req.body;

  const adminRes = await db.query(
    `SELECT * FROM admin_users WHERE email = $1`,
    [email]
  );

  if (adminRes.rows.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const admin = adminRes.rows[0];
  const match = await bcrypt.compare(password, admin.password_hash);

  if (!match) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { adminId: admin.id, role: admin.role },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ success: true, token });
}
