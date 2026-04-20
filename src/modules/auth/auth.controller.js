import { createUser, authenticateUser } from './auth.service.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';

export async function registerUser(req, res) {
  try {
    const { email, password, countryCode } = req.body;

    const user = await createUser({ email, password, countryCode });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await authenticateUser(email, password);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
}
