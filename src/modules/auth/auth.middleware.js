import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
