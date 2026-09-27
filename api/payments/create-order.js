// POST /api/payments/create-order — works for UPI, cards, netbanking.
// Frontend uses `payment_session_id` from response with Cashfree JS SDK.
const { addCorsHeaders, handleCorsPreflight } = require('../../utils/cors');
const { cfRequest } = require('../../lib/cashfree');
const { validateOrderData } = require('../../utils/validation');

module.exports = async function handler(req, res) {
    if (handleCorsPreflight(req, res)) return;
    addCorsHeaders(res, req.headers.origin || '*');
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { error, value } = validateOrderData(req.body || {});
    if (error) return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    try {
        const data = await cfRequest('POST', '/orders', { body: value });
        // data contains: cf_order_id, order_id, payment_session_id, order_status
        return res.status(200).json({ success: true, data });
    } catch (e) {
        console.error('Create order failed:', e.message);
        return res.status(e.status || 500).json({ success: false, error: 'Failed to create order', details: e.details || e.message });
    }
};
