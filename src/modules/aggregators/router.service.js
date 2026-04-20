// src/modules/aggregators/router.service.js
import { sendReloadlyTopup } from './reloadly.service.js';
import { sendDingTopup } from './ding.service.js';

export async function routeTopup(payload) {
  // Try Reloadly first
  try {
    const reloadlyResult = await sendReloadlyTopup(payload);
    if (reloadlyResult.success) {
      return reloadlyResult;
    }
  } catch (err) {
    console.log('Reloadly failed, trying Ding...', err?.response?.data || err?.message);
  }

  // Fallback to Ding
  const dingResult = await sendDingTopup(payload);
  return dingResult;
}
