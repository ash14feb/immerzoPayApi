// POST /api/whatsapp/send-template — forwards to Flaxxa WAPI as multipart/form-data.
// Token + base URL come from env (never from client).
// Body (JSON):
// {
//   "phone": "919986439557",
//   "template_name": "scann_tick",
//   "template_language": "en",            // optional, default "en"
//   "body_params": ["Ashwaq", "TICKET"],  // optional if "components" given
//   "components": "[...]" | [...],       // optional raw override
//   "attachmentUrl": "https://.../ticket.pdf", // optional public file URL
//   "attachmentFilename": "ticket.pdf"   // optional
// }
const { addCorsHeaders, handleCorsPreflight } = require('../../utils/cors');

const WAPI_BASE = (process.env.WHATSAPP_API_BASE || 'https://wapi.flaxxa.com/api/v1').replace(/\/$/, '');

module.exports = async function handler(req, res) {
    if (handleCorsPreflight(req, res)) return;
    addCorsHeaders(res, req.headers.origin || '*');
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const token = process.env.WHATSAPP_TOKEN;
    if (!token) return res.status(500).json({ success: false, error: 'WHATSAPP_TOKEN not configured on server' });

    try {
        const {
            phone,
            template_name,
            template_language = 'en',
            body_params,
            components,
            attachmentUrl,
            attachmentFilename,
        } = req.body || {};

        if (!phone || !String(phone).match(/^[0-9]{10,15}$/))
            return res.status(400).json({ success: false, error: 'phone required (10-15 digits, e.g. 919986439557)' });
        if (!template_name)
            return res.status(400).json({ success: false, error: 'template_name required (e.g. scann_tick)' });

        // Build components payload: prefer raw override, else build body params array.
        let componentsStr;
        if (components !== undefined) {
            componentsStr = typeof components === 'string' ? components : JSON.stringify(components);
        } else if (Array.isArray(body_params)) {
            componentsStr = JSON.stringify([{
                type: 'body',
                parameters: body_params.map((t) => ({ type: 'text', text: String(t) })),
            }]);
        } else {
            return res.status(400).json({ success: false, error: 'Provide body_params array or raw components' });
        }

        const form = new FormData();
        form.append('token', token);
        form.append('phone', String(phone));
        form.append('template_name', template_name);
        form.append('template_language', template_language);
        form.append('components', componentsStr);

        // Optional header attachment: download public URL on server, forward as file.
        if (attachmentUrl) {
            const dl = await fetch(attachmentUrl);
            if (!dl.ok) throw new Error(`attachment download failed: ${dl.status}`);
            const buf = Buffer.from(await dl.arrayBuffer());
            const filename = attachmentFilename
                || decodeURIComponent(attachmentUrl.split('?')[0].split('/').pop() || 'attachment');
            form.append('header_attachment', new Blob([buf]), filename);
        }

        const upstream = await fetch(`${WAPI_BASE}/sendtemplatemessage_withattachment`, {
            method: 'POST',
            body: form,
        });
        const text = await upstream.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        return res.status(upstream.ok ? 200 : (upstream.status || 502)).json({ success: upstream.ok, data });
    } catch (e) {
        console.error('WhatsApp send-template error:', e.message);
        return res.status(500).json({ success: false, error: 'Server error', details: e.message });
    }
};
