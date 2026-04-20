import { db } from '../../config/db.js';
import { writeLedgerEntry } from '../ledger/ledger.service.js';

export async function creditWallet(walletId, amount, currency, txId) {
  await writeLedgerEntry({
    walletId,
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

export async function debitWallet(walletId, amount, currency, txId) {
  await writeLedgerEntry({
    walletId,
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
