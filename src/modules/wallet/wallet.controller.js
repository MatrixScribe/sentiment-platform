import { creditWallet } from './wallet.service.js';
import { db } from '../../config/db.js';

export async function loadWallet(req, res) {
  const { userId, amount } = req.body;

  const wallet = await db.query(
    `SELECT * FROM wallets WHERE user_id = $1`,
    [userId]
  );

  const walletId = wallet.rows[0].id;

  const tx = await db.query(
    `INSERT INTO transactions (user_id, wallet_id, type, status, amount, currency)
     VALUES ($1, $2, 'wallet_load', 'success', $3, 'USD')
     RETURNING id`,
    [userId, walletId, amount]
  );

  await creditWallet(walletId, amount, 'USD', tx.rows[0].id);

  res.json({ success: true, balance: wallet.rows[0].balance + amount });
}
