// GET /api/payments/payments?order_id=xxx — list payments (upi/card/nb) for an order.
const { cfRequest } = require('../../lib/cashfree');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ success: false, error: 'order_id is required' });
    try {
        const data = await cfRequest('GET', `/orders/${encodeURIComponent(order_id)}/payments`);
        return res.status(200).json({ success: true, data });
    } catch (e) {
        return res.status(e.status || 500).json({ success: false, error: 'Failed to fetch payments', details: e.details || e.message });
    }
};
