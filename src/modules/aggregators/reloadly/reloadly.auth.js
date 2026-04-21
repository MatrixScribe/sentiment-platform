// src/modules/aggregators/reloadly/reloadly.auth.js
import axios from 'axios';

let cachedToken = null;
let tokenExpiry = null;

export async function getReloadlyToken() {
  const now = Date.now();

  // If token exists and not expired → return cached
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // Validate environment variables
  const clientId = process.env.RELOADLY_CLIENT_ID;
  const clientSecret = process.env.RELOADLY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Reloadly credentials missing. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.");
  }

  try {
    const response = await axios.post(
      "https://auth.reloadly.com/oauth/token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        audience: "https://topups.reloadly.com"
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache token + expiry
    cachedToken = access_token;
    tokenExpiry = now + (expires_in - 60) * 1000; // refresh 1 min early

    return cachedToken;

  } catch (err) {
    console.error("Reloadly Auth Error:", err.response?.data || err.message);
    throw new Error("Failed to authenticate with Reloadly");
  }
}
