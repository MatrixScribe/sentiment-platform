// src/modules/aggregators/ding.service.js
import axios from 'axios';
import { ENV } from '../../config/env.js';

export async function sendDingTopup({ productId, amount, recipient, reference, operatorCurrency }) {
  try {
    const res = await axios.post(
      'https://api.ding.com/Topup',
      {
        SkuCode: productId,
        SendValue: amount,
        AccountNumber: recipient,
        DistributorRef: reference
      },
      {
        headers: {
          'api-key': ENV.DING_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = res.data;
    const success = data?.ResultCode === 0;

    return {
      success,
      provider: 'ding',
      referenceId: data?.DistributorRef || reference || null,
      raw: data,
      rawRequest: {
        productId,
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
      provider: 'ding',
      referenceId: null,
      raw: rawError,
      rawRequest: {
        productId,
        amount,
        recipient,
        reference,
        operatorCurrency
      }
    };
  }
}
