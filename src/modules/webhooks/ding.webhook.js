import { db } from '../../config/db.js';
import { creditWallet } from '../wallet/wallet.service.js';

export async function handleDingWebhook(req, res) {
  try {
    const payload = req.body;

    const reference = payload.DistributorRef;
    const status = payload.ResultCode === 0 ? 'SUCCESS' : 'FAILED';

    const txRes = await db.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [reference]
    );

    if (txRes.rows.length === 0) {
      return res.status(404).json({ success: false });
    }

    const tx = txRes.rows[0];

    // Idempotency
    if (tx.status === 'success' || tx.status === 'failed') {
      return res.json({ success: true });
    }

    if (status === 'SUCCESS') {
      await db.query(
        `UPDATE transactions SET status = 'success', metadata = $2 WHERE id = $1`,
        [tx.id, payload]
      );
      return res.json({ success: true });
    }

    // FAILED → refund
    await creditWallet(tx.wallet_id, tx.amount, tx.currency, tx.id);

    await db.query(
      `UPDATE transactions SET status = 'failed', metadata = $2 WHERE id = $1`,
      [tx.id, payload]
    );

    res.json({ success: true });

  } catch (err) {
    console.error('Ding webhook error:', err);
    res.status(500).json({ success: false });
  }
}
