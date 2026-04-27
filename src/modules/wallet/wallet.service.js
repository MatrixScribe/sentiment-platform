import { db } from '../../config/db.js';
import { writeLedgerEntry } from '../ledger/ledger.service.js';

// -----------------------------
// Fetch wallet by ID (REQUIRED)
// -----------------------------
export async function getWalletById(walletId) {
  const result = await db.query(
    `SELECT * FROM wallets WHERE id = $1`,
    [walletId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Wallet not found for id: ${walletId}`);
  }

  return result.rows[0];
}

// -----------------------------
// Credit Wallet
// -----------------------------
export async function creditWallet(walletId, amount, currency, txId) {
  const wallet = await getWalletById(walletId);

  await writeLedgerEntry({
    walletId,
    userId: wallet.user_id,        // <-- REQUIRED
    relatedTxId: txId,
    entryType: 'credit',
    amount,
    currency,
    description: 'Wallet credit'
  });

  await db.query(
    `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
    [amount, walletId]
  );
}

// -----------------------------
// Debit Wallet
// -----------------------------
export async function debitWallet(walletId, amount, currency, txId) {
  const wallet = await getWalletById(walletId);

  await writeLedgerEntry({
    walletId,
    userId: wallet.user_id,        // <-- REQUIRED
    relatedTxId: txId,
    entryType: 'debit',
    amount,
    currency,
    description: 'Wallet debit'
  });

  await db.query(
    `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
    [amount, walletId]
  );
}
