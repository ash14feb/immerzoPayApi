// POST /api/createPaymentLink — via shared lib/cashfree.js (no hardcoded keys).
const { cfRequest } = require('../lib/cashfree');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const data = await cfRequest('POST', '/links', { body: req.body });
        return res.status(200).json(data);
    } catch (e) {
        console.error('Error calling Cashfree:', e.message);
        return res.status(e.status || 500).json({ error: 'Server error', details: e.details || e.message });
    }
};
