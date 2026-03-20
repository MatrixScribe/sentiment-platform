const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const event = req.body;

  try {
    console.log("Webhook received:", event.event_type);

    switch (event.event_type) {

      // 🔵 SUBSCRIPTIONS
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        console.log("Subscription activated:", event.resource.id);
        // TODO: Insert into subscriptions table + activate tenant
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log("Subscription cancelled:", event.resource.id);
        // TODO: Update subscriptions table + deactivate tenant
        break;

      // 🔵 RECURRING PAYMENTS
      case "PAYMENT.SALE.COMPLETED":
        console.log("Subscription payment completed:", event.resource.id);
        // TODO: Insert into payments table
        break;

      // 🔵 ONE-TIME ORDERS (PROJECT BILLING)
      case "CHECKOUT.ORDER.APPROVED":
        console.log("Order approved:", event.resource.id);
        // TODO: Mark project as approved (optional)
        break;

      case "PAYMENT.CAPTURE.COMPLETED":
        console.log("Order payment captured:", event.resource.id);
        // TODO: Mark project as PAID in projects table
        break;

      // 🔵 INVOICING (ENTERPRISE)
      case "INVOICING.INVOICE.PAID":
        console.log("Invoice paid:", event.resource.id);
        // TODO: Update invoices table (status = PAID, paid_at = NOW)
        break;

      default:
        console.log("Unhandled webhook event:", event.event_type);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
