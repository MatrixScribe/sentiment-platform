// src/routes/authRoute.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// --------- SIGNUP ---------
router.post('/signup', async (req, res) => {
  try {
    const { email, password, tenant_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!tenant_id) {
      return res.status(400).json({ error: "tenant_id is required for signup" });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await db.createUser(email, hash, tenant_id);

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// --------- LOGIN ---------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email,
        tenant_id: user.tenant_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set JWT as HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // ⭐ FIX: RETURN TOKEN IN JSON
    res.json({
      ok: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
