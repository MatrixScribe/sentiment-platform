const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAccessToken } = require("../services/paypalClient");

// Create a one-time order
router.post("/create-order", async (req, res) => {
  const { price, description } = req.body;

  try {
    const accessToken = await getAccessToken();

    const response = await axios({
      url: "https://api-m.paypal.com/v2/checkout/orders",
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: price.toString(),
            },
            description,
          },
        ],
        application_context: {
          brand_name: "MatrixScribe",
          return_url: "https://matrixscribe.com/project/success",
          cancel_url: "https://matrixscribe.com/project/cancel",
        },
      },
    });

    const approvalLink = response.data.links.find(
      (l) => l.rel === "approve"
    )?.href;

    res.json({
      ok: true,
      orderId: response.data.id,
      approvalLink,
    });
  } catch (err) {
    console.error("PayPal order error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

module.exports = router;
