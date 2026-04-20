import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false, message: 'Missing token' });

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded.adminId) throw new Error();
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
}
