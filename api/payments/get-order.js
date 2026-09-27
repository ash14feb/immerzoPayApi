// GET /api/payments/order?order_id=xxx — fetch order status.
const { addCorsHeaders, handleCorsPreflight } = require('../../utils/cors');
const { cfRequest } = require('../../lib/cashfree');

module.exports = async function handler(req, res) {
    if (handleCorsPreflight(req, res)) return;
    addCorsHeaders(res, req.headers.origin || '*');
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ success: false, error: 'order_id is required' });
    try {
        const data = await cfRequest('GET', `/orders/${encodeURIComponent(order_id)}`);
        return res.status(200).json({ success: true, data });
    } catch (e) {
        return res.status(e.status || 500).json({ success: false, error: 'Failed to fetch order', details: e.details || e.message });
    }
};
