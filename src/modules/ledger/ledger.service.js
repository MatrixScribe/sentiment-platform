import { db } from '../../config/db.js';

export async function writeLedgerEntry({
  walletId,
  userId,
  relatedTxId,
  entryType,
  amount,
  currency,
  description
}) {
  const result = await db.query(
    `INSERT INTO ledger_entries 
      (wallet_id, user_id, related_tx_id, entry_type, amount, currency, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [walletId, userId, relatedTxId, entryType, amount, currency, description]
  );

  return result.rows[0];
}
