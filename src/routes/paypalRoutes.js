const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAccessToken } = require("../services/paypalClient");

// Create subscription
router.post("/create-subscription", async (req, res) => {
  const { plan_id } = req.body;

  try {
    const accessToken = await getAccessToken();

    const response = await axios({
      url: "https://api-m.paypal.com/v1/billing/subscriptions",
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        plan_id,
        application_context: {
          brand_name: "MatrixScribe",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: "https://matrixscribe.com/billing/success",
          cancel_url: "https://matrixscribe.com/billing/cancel",
        },
      },
    });

    const approvalLink = response.data.links.find(
      (l) => l.rel === "approve"
    )?.href;

    if (!approvalLink) {
      return res.status(500).json({ error: "No approval link returned" });
    }

    res.json({ ok: true, approvalLink });
  } catch (err) {
    console.error("PayPal subscription error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

module.exports = router;
