// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authMiddleware(req, res, next) {
  // Allow OPTIONS preflight to pass through
  if (req.method === "OPTIONS") {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  // CRON bypass
  if (token === process.env.CRON_TOKEN) {
    req.user = {
      id: 0,
      email: "cron@system",
      tenant_id: 1
    };
    return next();
  }

  // Normal JWT auth
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      tenant_id: decoded.tenant_id
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
