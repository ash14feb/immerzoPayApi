require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/sales/create', require('./api/sales/create'));
app.use('/api/sales/get', require('./api/sales/get'));
app.use('/api/sales/stats', require('./api/sales/stats'));
app.use('/api/sales/update', require('./api/sales/update'));
app.use('/api/createPaymentLink', require('./api/createPaymentLink'));
app.use('/api/getPaymentLinkDetails', require('./api/getPaymentLinkDetails'));

// WhatsApp (Flaxxa WAPI) — token from env
app.use('/api/whatsapp/send-template', require('./api/whatsapp/send-template'));

// Cashfree PG (orders + payments: UPI, cards, netbanking via payment_session_id)
app.post('/api/payments/create-order', require('./api/payments/create-order'));
app.get('/api/payments/order', require('./api/payments/get-order'));
app.get('/api/payments/payments', require('./api/payments/get-payments'));
app.post('/api/payments/webhook', require('./api/payments/webhook'));

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

module.exports = app;
