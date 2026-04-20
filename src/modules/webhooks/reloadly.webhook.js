// src/modules/webhooks/reloadly.webhook.js
import { db } from '../../config/db.js';
import { creditWallet } from '../wallet/wallet.service.js';

export async function handleReloadlyWebhook(req, res) {
  try {
    const payload = req.body;

    const reference = payload.customIdentifier; // our txId
    const status = payload.status; // SUCCESS or FAILED

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

    // Update topup_requests
    await db.query(
      `
      UPDATE topup_requests
      SET
        aggregator_status = $2,
        raw_response = $3,
        updated_at = NOW()
      WHERE transaction_id = $1
      `,
      [reference, status === 'SUCCESS' ? 'success' : 'failed', payload]
    );

    if (status === 'SUCCESS') {
      await db.query(
        `UPDATE transactions SET status = 'success', metadata = $2 WHERE id = $1`,
        [tx.id, payload]
      );
      return res.json({ success: true });
    }

    // FAILED → refund full debit
    await creditWallet(tx.wallet_id, tx.amount, tx.currency, tx.id);

    await db.query(
      `UPDATE transactions SET status = 'failed', metadata = $2 WHERE id = $1`,
      [tx.id, payload]
    );

    res.json({ success: true });

  } catch (err) {
    console.error('Reloadly webhook error:', err);
    res.status(500).json({ success: false });
  }
}
