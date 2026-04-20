// src/modules/topups/topup.service.js
import { db } from '../../config/db.js';
import { debitWallet, creditWallet } from '../wallet/wallet.service.js';
import { routeTopup } from '../aggregators/router.service.js';

async function getWallet(walletId) {
  const res = await db.query(
    `SELECT id, balance, currency FROM wallets WHERE id = $1`,
    [walletId]
  );
  if (res.rows.length === 0) {
    throw new Error('WALLET_NOT_FOUND');
  }
  return res.rows[0];
}

async function getOperator(operatorId) {
  const res = await db.query(
    `SELECT * FROM operators WHERE id = $1 AND is_active = true`,
    [operatorId]
  );
  if (res.rows.length === 0) {
    throw new Error('OPERATOR_NOT_FOUND_OR_INACTIVE');
  }
  return res.rows[0];
}

async function getProduct(productId) {
  const res = await db.query(
    `SELECT * FROM products WHERE id = $1 AND is_active = true`,
    [productId]
  );
  if (res.rows.length === 0) {
    throw new Error('PRODUCT_NOT_FOUND_OR_INACTIVE');
  }
  return res.rows[0];
}

async function getFeeRule({ countryCode, operatorId, productType }) {
  const res = await db.query(
    `
    SELECT *
    FROM fee_rules
    WHERE is_active = true
      AND (country_code IS NULL OR country_code = $1)
      AND (operator_id IS NULL OR operator_id = $2)
      AND (product_type IS NULL OR product_type = $3)
    ORDER BY
      (operator_id IS NOT NULL)::int DESC,
      (product_type IS NOT NULL)::int DESC,
      (country_code IS NOT NULL)::int DESC,
      created_at DESC
    LIMIT 1
    `,
    [countryCode, operatorId, productType]
  );

  return res.rows[0] || null;
}

async function getFxRate(baseCurrency, quoteCurrency) {
  if (baseCurrency === quoteCurrency) {
    return { rate: 1 };
  }

  const res = await db.query(
    `
    SELECT rate
    FROM fx_rates
    WHERE base_currency = $1
      AND quote_currency = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [baseCurrency, quoteCurrency]
  );

  if (res.rows.length === 0) {
    throw new Error('FX_RATE_NOT_FOUND');
  }

  return { rate: Number(res.rows[0].rate) };
}

export async function createTopup({
  userId,
  walletId,
  operatorId,
  productId,
  amount,
  currency,
  recipient
}) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1) Load wallet, operator, product
    const wallet = await getWallet(walletId);
    const operator = await getOperator(operatorId);
    const product = productId ? await getProduct(productId) : null;

    const walletCurrency = wallet.currency;
    const operatorCurrency = product ? product.currency : currency || 'USD';
    const operatorCountry = operator.country_code;
    const productType = product ? product.type : null;

    const operatorAmount = Number(amount);

    // 2) Load fee rule
    const feeRule = await getFeeRule({
      countryCode: operatorCountry,
      operatorId,
      productType
    });

    const markupPercent = feeRule?.markup_percent ? Number(feeRule.markup_percent) : 0;
    const serviceFeeFlat = feeRule?.service_fee_flat ? Number(feeRule.service_fee_flat) : 0;
    const fxSpreadPercent = feeRule?.fx_spread_percent ? Number(feeRule.fx_spread_percent) : 0;

    // 3) FX rate (wallet -> operator)
    const { rate: baseFxRate } = await getFxRate(walletCurrency, operatorCurrency);
    const effectiveFxRate = baseFxRate * (1 + fxSpreadPercent / 100);

    // 4) Compute revenue + debit
    const markupAmount = operatorAmount * (markupPercent / 100); // in operator currency
    const grossOperatorAmount = operatorAmount + markupAmount;   // in operator currency

    // convert operator currency back to wallet currency using effective rate
    // base = wallet, quote = operator → walletAmount = quoteAmount / rate
    const walletAmountForTopup = grossOperatorAmount / effectiveFxRate;

    const totalDebit = walletAmountForTopup + serviceFeeFlat;

    // 5) Check balance
    const currentBalance = Number(wallet.balance);
    if (currentBalance < totalDebit) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // 6) Create pending transaction
    const txRes = await client.query(
      `
      INSERT INTO transactions (
        user_id,
        wallet_id,
        type,
        status,
        amount,
        currency,
        operator_id,
        product_id,
        operator_amount,
        operator_currency,
        markup_amount,
        service_fee_amount,
        fx_rate_used,
        fx_spread_percent,
        aggregator
      )
      VALUES (
        $1,$2,'airtime_purchase','pending',$3,$4,
        $5,$6,$7,$8,$9,$10,$11,$12,NULL
      )
      RETURNING id
      `,
      [
        userId,
        walletId,
        totalDebit,
        walletCurrency,
        operatorId,
        productId,
        operatorAmount,
        operatorCurrency,
        markupAmount,
        serviceFeeFlat,
        baseFxRate,
        fxSpreadPercent
      ]
    );

    const txId = txRes.rows[0].id;

    // 7) Reserve funds (wallet currency)
    await debitWallet(walletId, totalDebit, walletCurrency, txId);

    // 8) Create topup_requests row (pending)
    const topupReqRes = await client.query(
      `
      INSERT INTO topup_requests (
        transaction_id,
        user_id,
        wallet_id,
        operator_id,
        product_id,
        recipient_msisdn,
        amount,
        currency,
        aggregator,
        aggregator_status,
        raw_request,
        raw_response
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11
      )
      RETURNING id
      `,
      [
        txId,
        userId,
        walletId,
        operatorId,
        productId,
        recipient,
        operatorAmount,
        operatorCurrency,
        'reloadly', // initial attempt
        null,
        null
      ]
    );

    const topupRequestId = topupReqRes.rows[0].id;

    // 9) Build aggregator payload
    const payload = {
      operatorId,
      productId,
      amount: operatorAmount,
      recipient,
      reference: txId,
      operatorCurrency
    };

    // 10) Route to Reloadly → Ding
    const result = await routeTopup(payload);

    // 11) Update topup_requests with aggregator result
    await client.query(
      `
      UPDATE topup_requests
      SET
        aggregator = $2,
        aggregator_request_id = $3,
        aggregator_status = $4,
        raw_request = $5,
        raw_response = $6,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        topupRequestId,
        result.provider,
        result.referenceId || null,
        result.success ? 'success' : 'failed',
        result.rawRequest || null,
        result.raw || null
      ]
    );

    // 12) Handle failure
    if (!result.success) {
      await creditWallet(walletId, totalDebit, walletCurrency, txId);

      await client.query(
        `
        UPDATE transactions
        SET status = 'failed', metadata = $2, aggregator = $3
        WHERE id = $1
        `,
        [txId, result.raw || {}, result.provider]
      );

      await client.query('COMMIT');

      return { success: false, txId };
    }

    // 13) Mark success
    await client.query(
      `
      UPDATE transactions
      SET status = 'success', metadata = $2, aggregator = $3
      WHERE id = $1
      `,
      [txId, result.raw || {}, result.provider]
    );

    await client.query('COMMIT');

    return {
      success: true,
      txId,
      provider: result.provider
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createTopup error:', err);
    throw err;
  } finally {
    client.release();
  }
}
