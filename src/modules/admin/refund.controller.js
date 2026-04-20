import { db } from '../../config/db.js';
import { creditWallet } from '../wallet/wallet.service.js';

export async function adminRefund(req, res) {
  const { txId } = req.body;

  const txRes = await db.query(
    `SELECT * FROM transactions WHERE id = $1`,
    [txId]
  );

  if (txRes.rows.length === 0) {
    return res.status(404).json({ success: false });
  }

  const tx = txRes.rows[0];

  await creditWallet(tx.wallet_id, tx.amount, tx.currency, tx.id);

  await db.query(
    `UPDATE transactions SET status = 'reversed' WHERE id = $1`,
    [txId]
  );

  await db.query(
    `INSERT INTO audit_logs (admin_id, user_id, action, details)
     VALUES ($1,$2,'refund',$3)`,
    [req.admin.adminId, tx.user_id, { txId }]
  );

  res.json({ success: true });
}
