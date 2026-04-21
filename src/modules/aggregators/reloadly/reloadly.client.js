// src/modules/aggregators/reloadly/reloadly.client.js
import axios from 'axios';
import { getReloadlyToken } from './reloadly.auth.js';

export async function reloadlyRequest(method, url, data = null) {
  const token = await getReloadlyToken();

  try {
    const response = await axios({
      method,
      url: `https://topups.reloadly.com${url}`,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });

    return response.data;

  } catch (err) {
    console.error("Reloadly API Error:", err.response?.data || err.message);
    throw new Error("Reloadly API request failed");
  }
}
