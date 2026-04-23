// src/modules/aggregators/reloadly/reloadly.auth.js
import axios from "axios";

let cachedTokens = {
  operators: null,
  topups: null,
};

let tokenExpiry = {
  operators: 0,
  topups: 0,
};

async function requestReloadlyToken(audience) {
  const clientId = process.env.RELOADLY_CLIENT_ID;
  const clientSecret = process.env.RELOADLY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Reloadly credentials missing.");
  }

  const response = await axios.post(
    "https://auth.reloadly.com/oauth/token",
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data;
}

export async function getReloadlyOperatorsToken() {
  const now = Date.now();

  if (cachedTokens.operators && tokenExpiry.operators > now) {
    return cachedTokens.operators;
  }

  const { access_token, expires_in } = await requestReloadlyToken(
    "https://operators.reloadly.com"
  );

  cachedTokens.operators = access_token;
  tokenExpiry.operators = now + (expires_in - 60) * 1000;

  return access_token;
}

export async function getReloadlyTopupsToken() {
  const now = Date.now();

  if (cachedTokens.topups && tokenExpiry.topups > now) {
    return cachedTokens.topups;
  }

  const { access_token, expires_in } = await requestReloadlyToken(
    "https://topups.reloadly.com"
  );

  cachedTokens.topups = access_token;
  tokenExpiry.topups = now + (expires_in - 60) * 1000;

  return access_token;
}
