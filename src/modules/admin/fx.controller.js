import { db } from '../../config/db.js';

export async function setFxRate(req, res) {
  const { base_currency, quote_currency, rate } = req.body;

  await db.query(
    `INSERT INTO fx_rates (base_currency, quote_currency, rate, source)
     VALUES ($1,$2,$3,'manual')
     ON CONFLICT (base_currency, quote_currency)
     DO UPDATE SET rate = EXCLUDED.rate`,
    [base_currency, quote_currency, rate]
  );

  res.json({ success: true });
}

export async function listFxRates(req, res) {
  const result = await db.query(`SELECT * FROM fx_rates ORDER BY created_at DESC`);
  res.json({ success: true, rates: result.rows });
}
