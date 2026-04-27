import { db } from '../../config/db.js';
import { getWalletById } from '../wallet/wallet.service.js';

export async function writeLedgerEntry({
  walletId,
  relatedTxId,
  entryType,
  amount,
  currency,
  description
}) {
  // 1. Fetch wallet to get user_id
  const walletRes = await db.query(
    `SELECT user_id FROM wallets WHERE id = $1`,
    [walletId]
  );

  if (walletRes.rows.length === 0) {
    throw new Error(`Wallet not found for id: ${walletId}`);
  }

  const userId = walletRes.rows[0].user_id;

  // 2. Insert ledger entry with user_id included
  const result = await db.query(
    `INSERT INTO ledger_entries 
      (wallet_id, user_id, related_tx_id, entry_type, amount, currency, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [walletId, userId, relatedTxId, entryType, amount, currency, description]
  );

  return result.rows[0];
}
