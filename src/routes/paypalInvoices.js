const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAccessToken } = require("../services/paypalClient");

// Create and send an invoice
router.post("/create-invoice", async (req, res) => {
  const { user_id, amount, description } = req.body;

  try {
    const accessToken = await getAccessToken();

    // 1. Create invoice
    const createInvoice = await axios({
      url: "https://api-m.paypal.com/v2/invoicing/invoices",
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        detail: {
          currency_code: "USD",
          note: description,
          terms_and_conditions: "Payment due upon receipt.",
        },
        invoicer: {
          name: { given_name: "MatrixScribe" },
        },
        items: [
          {
            name: description,
            quantity: "1",
            unit_amount: {
              currency_code: "USD",
              value: amount.toString(),
            },
          },
        ],
      },
    });

    const invoiceId = createInvoice.data.id;

    // 2. Send invoice
    await axios({
      url: `https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`,
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json({
      ok: true,
      invoiceId,
      message: "Invoice created and sent successfully",
    });

  } catch (err) {
    console.error("Invoice error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

module.exports = router;
