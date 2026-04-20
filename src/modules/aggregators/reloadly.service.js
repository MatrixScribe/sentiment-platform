// src/modules/aggregators/reloadly.service.js
import axios from 'axios';
import { ENV } from '../../config/env.js';

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

export async function sendReloadlyTopup({ operatorId, amount, recipient, reference, operatorCurrency }) {
  const token = await getReloadlyToken();

  try {
    const res = await axios.post(
      'https://topups.reloadly.com/topups',
      {
        operatorId,
        amount,
        recipientPhone: {
          countryCode: '', // can be enhanced later
          number: recipient
        },
        customIdentifier: reference
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/com.reloadly.topups-v1+json'
        }
      }
    );

    const data = res.data;

    return {
      success: true,
      provider: 'reloadly',
      referenceId: data.transactionId || data.id || null,
      raw: data,
      rawRequest: {
        operatorId,
        amount,
        recipient,
        reference,
        operatorCurrency
      }
    };

  } catch (err) {
    const rawError = err.response?.data || null;

    return {
      success: false,
      provider: 'reloadly',
      referenceId: null,
      raw: rawError,
      rawRequest: {
        operatorId,
        amount,
        recipient,
        reference,
        operatorCurrency
      }
    };
  }
}
