import axios from 'axios';
import { ENV } from '../../../config/env.js';

console.log("DEBUG PAYSTACK_BASE_URL =", ENV.PAYSTACK_BASE_URL);

const paystack = axios.create({
  baseURL: ENV.PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${ENV.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

export async function paystackInitialize(amount, email, reference) {
  const res = await paystack.post('/transaction/initialize', {
    amount: amount * 100, // Paystack uses kobo
    email,
    reference,
    callback_url: `${ENV.BASE_URL}/wallet/load/paystack/callback`
  });

  return res.data;
}

export async function paystackVerify(reference) {
  const res = await paystack.get(`/transaction/verify/${reference}`);
  return res.data;
}
