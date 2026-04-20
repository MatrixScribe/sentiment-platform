import { db } from '../../config/db.js';

export async function createFeeRule(req, res) {
  const {
    scope,
    country_code,
    operator_id,
    product_type,
    markup_percent,
    service_fee_flat,
    fx_spread_percent
  } = req.body;

  const result = await db.query(
    `INSERT INTO fee_rules (scope, country_code, operator_id, product_type, markup_percent, service_fee_flat, fx_spread_percent, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)
     RETURNING *`,
    [scope, country_code, operator_id, product_type, markup_percent, service_fee_flat, fx_spread_percent]
  );

  res.json({ success: true, rule: result.rows[0] });
}

export async function listFeeRules(req, res) {
  const result = await db.query(`SELECT * FROM fee_rules ORDER BY created_at DESC`);
  res.json({ success: true, rules: result.rows });
}

export async function updateFeeRule(req, res) {
  const { id } = req.params;
  const updates = req.body;

  const fields = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 1}`)
    .join(', ');

  const values = Object.values(updates);

  await db.query(
    `UPDATE fee_rules SET ${fields} WHERE id = '${id}'`,
    values
  );

  res.json({ success: true });
}
