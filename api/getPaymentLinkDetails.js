// GET /api/getPaymentLinkDetails?link_id=xxx — via shared lib/cashfree.js.
const { addCorsHeaders, handleCorsPreflight } = require('../utils/cors');
const { cfRequest } = require('../lib/cashfree');

module.exports = async function handler(req, res) {
    if (handleCorsPreflight(req, res)) return;
    addCorsHeaders(res, req.headers.origin || '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Only GET allowed' });
    const { link_id } = req.query;
    if (!link_id) return res.status(400).json({ error: 'link_id is required' });
    try {
        const data = await cfRequest('GET', `/links/${encodeURIComponent(link_id)}`);
        return res.status(200).json(data);
    } catch (e) {
        console.error('Error fetching payment link details:', e.message);
        return res.status(e.status || 500).json({ error: 'Server error', details: e.details || e.message });
    }
};
