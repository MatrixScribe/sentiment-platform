// src/modules/admin/transaction.controller.js
import { db } from '../../config/db.js';

export async function listTransactions(req, res) {
  const result = await db.query(
    `
    SELECT
      t.*,
      o.name AS operator_name,
      p.name AS product_name
    FROM transactions t
    LEFT JOIN operators o ON t.operator_id = o.id
    LEFT JOIN products p ON t.product_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 200
    `
  );
  res.json({ success: true, transactions: result.rows });
}

export async function getTransaction(req, res) {
  const { id } = req.params;

  const result = await db.query(
    `
    SELECT
      t.*,
      o.name AS operator_name,
      p.name AS product_name,
      tr.aggregator,
      tr.aggregator_status,
      tr.aggregator_request_id,
      tr.raw_request,
      tr.raw_response
    FROM transactions t
    LEFT JOIN operators o ON t.operator_id = o.id
    LEFT JOIN products p ON t.product_id = p.id
    LEFT JOIN topup_requests tr ON tr.transaction_id = t.id
    WHERE t.id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, transaction: result.rows[0] });
}
