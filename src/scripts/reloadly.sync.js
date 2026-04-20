import axios from 'axios';
import { db } from '../config/db.js';
import { ENV } from '../config/env.js';

let reloadlyToken = null;
let reloadlyTokenExpiresAt = null;

async function getReloadlyToken() {
  if (reloadlyToken && reloadlyTokenExpiresAt > Date.now()) {
    return reloadlyToken;
  }

  const res = await axios.post('https://auth.reloadly.com/oauth/token', {
    client_id: ENV.RELOADLY_CLIENT_ID,
    client_secret: ENV.RELOADLY_CLIENT_SECRET,
    grant_type: 'client_credentials',
    audience: 'https://topups.reloadly.com'
  });

  reloadlyToken = res.data.access_token;
  reloadlyTokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;

  return reloadlyToken;
}

async function syncReloadlyOperators() {
  const token = await getReloadlyToken();

  const res = await axios.get(
    'https://topups.reloadly.com/operators',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/com.reloadly.topups-v1+json'
      }
    }
  );

  const operators = res.data;

  for (const op of operators) {
    await db.query(
      `INSERT INTO operators (country_code, name, external_id_reloadly, logo_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (external_id_reloadly)
       DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url`,
      [op.country?.isoName, op.name, op.id.toString(), op.logoUrls?.[0] || null]
    );
  }

  console.log(`Reloadly operators synced: ${operators.length}`);
}

async function syncReloadlyProducts() {
  const token = await getReloadlyToken();

  const res = await axios.get(
    'https://topups.reloadly.com/operators/products',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/com.reloadly.topups-v1+json'
      }
    }
  );

  const products = res.data;

  for (const p of products) {
    await db.query(
      `INSERT INTO products (operator_id, type, name, min_amount, max_amount, currency, denomination_type, external_id_reloadly, is_active)
       VALUES (
         (SELECT id FROM operators WHERE external_id_reloadly = $1),
         $2, $3, $4, $5, $6, $7, $8, true
       )
       ON CONFLICT (external_id_reloadly)
       DO UPDATE SET name = EXCLUDED.name, max_amount = EXCLUDED.max_amount`,
      [
        p.operatorId.toString(),
        p.productType || 'airtime',
        p.name,
        p.minAmount,
        p.maxAmount,
        p.localAmount?.currencyCode || 'USD',
        p.denominationType,
        p.id.toString()
      ]
    );
  }

  console.log(`Reloadly products synced: ${products.length}`);
}

async function run() {
  await syncReloadlyOperators();
  await syncReloadlyProducts();
  process.exit(0);
}

run();
