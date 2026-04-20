import { db } from '../../../config/db.js';
import { paystackInitialize } from './paystack.service.js';
import { creditWallet } from '../../wallet/wallet.service.js';
import crypto from 'crypto';
import { ENV } from '../../../config/env.js';

export async function initiatePaystackPayment(req, res) {
  const { userId, walletId, amount } = req.body;

  const reference = crypto.randomUUID();

  // Create pending transaction
  await db.query(
    `INSERT INTO transactions (id, user_id, wallet_id, type, status, amount, currency)
     VALUES ($1,$2,$3,'wallet_load','pending',$4,'ZAR')`,
    [reference, userId, walletId, amount]
  );

  const userRes = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]);
  const email = userRes.rows[0].email;

  const init = await paystackInitialize(amount, email, reference);

  res.json({
    success: true,
    authorization_url: init.data.authorization_url,
    reference
  });
}

export async function paystackWebhook(req, res) {
  try {
    const signature = req.headers['x-paystack-signature'];

    // IMPORTANT: req.body is raw buffer because of express.raw()
    const expected = crypto
      .createHmac('sha512', ENV.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);

    if (event.event !== 'charge.success') {
      return res.json({ success: true });
    }

    const reference = event.data.reference;

    // Fetch transaction
    const txRes = await db.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [reference]
    );

    if (txRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const tx = txRes.rows[0];

    // Idempotency: if already processed, exit
    if (tx.status === 'success') {
      return res.json({ success: true, message: 'Already processed' });
    }

    // Verify amount (Paystack sends kobo)
    const paidAmount = event.data.amount / 100;
    if (paidAmount !== Number(tx.amount)) {
      console.error('Amount mismatch');
      return res.status(400).json({ success: false, message: 'Amount mismatch' });
    }

    // Credit wallet
    await creditWallet(tx.wallet_id, tx.amount, tx.currency, tx.id);

    // Update transaction
    await db.query(
      `UPDATE transactions SET status = 'success', metadata = $2 WHERE id = $1`,
      [tx.id, JSON.stringify(event)]
    );

    return res.json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ success: false });
  }
}

