import { createTopup } from './topup.service.js';

export async function handleTopup(req, res) {
  try {
    const userId = req.user.userId; // from JWT
    const { walletId, operatorId, productId, amount, currency, recipient } = req.body;

    if (!walletId || !operatorId || !amount || !recipient) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await createTopup({
      userId,
      walletId,
      operatorId,
      productId,
      amount,
      currency: currency || 'USD',
      recipient
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        txId: result.txId,
        message: 'Top-up failed'
      });
    }

    res.json({
      success: true,
      txId: result.txId,
      provider: result.provider
    });

  } catch (err) {
    console.error('Topup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
