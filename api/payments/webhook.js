// POST /api/payments/webhook — Cashfree notify_url target. Verifies signature.
const express = require('express');
const { verifyWebhookSignature } = require('../../lib/cashfree');

async function webhookHandler(req, res) {
    try {
        const rawBody = JSON.stringify(req.body);
        const timestamp = req.headers['x-webhook-timestamp'];
        const signature = req.headers['x-webhook-signature'];
        if (!timestamp || !signature || !verifyWebhookSignature(rawBody, timestamp, signature)) {
            return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
        }
        const { order_id, order_amount, payment_status } = req.body?.data?.order || {};
        console.log('Cashfree webhook:', { order_id, order_amount, payment_status });
        // TODO: update PhotoAISales / orders table here when payment_status === 'PAID'
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('Webhook error:', e.message);
        return res.status(500).json({ success: false, error: 'Webhook failed' });
    }
}

module.exports = webhookHandler;
module.exports.rawBodyMiddleware = express.json();
