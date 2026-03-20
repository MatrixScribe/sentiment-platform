const axios = require("axios");

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await axios({
    url: "https://api-m.paypal.com/v1/oauth2/token",
    method: "post",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "grant_type=client_credentials",
  });

  return response.data.access_token;
}

module.exports = { getAccessToken };
