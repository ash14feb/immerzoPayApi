// Single place for Cashfree credentials + base URL + request helper.
// Env: CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET, CASHFREE_ENV=sandbox|production, CASHFREE_API_VERSION
const API_VERSION = process.env.CASHFREE_API_VERSION || '2025-01-01';

function getBaseUrl() {
    const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();
    return env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
}

function getCredentials() {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET env vars');
    }
    return { clientId, clientSecret };
}

function buildHeaders(extra = {}) {
    const { clientId, clientSecret } = getCredentials();
    return {
        'Content-Type': 'application/json',         
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': API_VERSION,
        ...extra,
    };
}

async function cfRequest(method, path, { body, query, headers } = {}) {
    let url = `${getBaseUrl()}${path}`;
    if (query) {
        const qs = new URLSearchParams(query).toString();
        if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, {
        method,
        headers: buildHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.message || `Cashfree ${res.status}`);
        err.status = res.status;
        err.details = data;
        throw err;
    }
    return data;
}

// Webhook verification per Cashfree docs:
// signature header `x-webhook-signature` = base64(HMAC_SHA256(timestamp + rawBody, clientSecret))
function verifyWebhookSignature(rawBody, timestamp, signature) {
    const crypto = require('crypto');
    const { clientSecret } = getCredentials();
    const expected = crypto.createHmac('sha256', clientSecret).update(`${timestamp}${rawBody}`).digest('base64');
    return expected === signature;
}

module.exports = { getBaseUrl, getCredentials, buildHeaders, cfRequest, verifyWebhookSignature, API_VERSION };
