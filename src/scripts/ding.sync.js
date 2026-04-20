import axios from 'axios';
import { db } from '../config/db.js';
import { ENV } from '../config/env.js';

async function syncDingOperators() {
  const res = await axios.get(
    'https://api.ding.com/Operators',
    {
      headers: {
        'api-key': ENV.DING_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const operators = res.data.Items || [];

  for (const op of operators) {
    await db.query(
      `INSERT INTO operators (country_code, name, external_id_ding, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (external_id_ding)
       DO UPDATE SET name = EXCLUDED.name`,
      [op.CountryIso, op.Name, op.OperatorId.toString()]
    );
  }

  console.log(`Ding operators synced: ${operators.length}`);
}

async function syncDingProducts() {
  const res = await axios.get(
    'https://api.ding.com/Products',
    {
      headers: {
        'api-key': ENV.DING_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const products = res.data.Items || [];

  for (const p of products) {
    await db.query(
      `INSERT INTO products (operator_id, type, name, min_amount, max_amount, currency, denomination_type, external_id_ding, is_active)
       VALUES (
         (SELECT id FROM operators WHERE external_id_ding = $1),
         $2, $3, $4, $5, $6, $7, $8, true
       )
       ON CONFLICT (external_id_ding)
       DO UPDATE SET name = EXCLUDED.name`,
      [
        p.OperatorId.toString(),
        p.ProductType || 'airtime',
        p.Name,
        p.Minimum?.Value || 0,
        p.Maximum?.Value || 0,
        p.Minimum?.CurrencyCode || 'USD',
        p.DenominationType,
        p.ProductId.toString()
      ]
    );
  }

  console.log(`Ding products synced: ${products.length}`);
}

async function run() {
  await syncDingOperators();
  await syncDingProducts();
  process.exit(0);
}

run();
