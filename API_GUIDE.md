# API Guide — AIPhotoBackend + Cashfree

Base URL (local): `http://localhost:3000`
Health: `GET /health` → `{ "ok": true }`

All JSON. Sales routes add CORS headers. Cashfree backend is pinned to **production** (`lib/cashfree.js` → `https://api.cashfree.com/pg`), so frontend SDK must use `mode: 'production'`.

---

## 1. Sales (PhotoAISales table)

### POST /api/sales/create — Create sale
Body:
```json
{
  "ThemeName": "Wedding",
  "Amount": 499,
  "PhotoURL": "https://.../out.jpg",
  "OriginalImageURL": "https://.../in.jpg",
  "DateTime": "2026-09-27T10:00:00"
}
```
Required: `ThemeName` (2–255 chars), `Amount` (number), `PhotoURL` (uri). Optional: `OriginalImageURL` (uri or ""), `DateTime` (ISO, defaults now).
Responses: `201 { success, message, data }` | `400 validation` | `500`.
Example:
```bash
curl -X POST http://localhost:3000/api/sales/create \
 -H "Content-Type: application/json" \
 -d '{"ThemeName":"Wedding","Amount":499,"PhotoURL":"https://x/y.jpg"}'
```

### GET /api/sales/get — List / filter sales
Query (all optional): `id, theme (LIKE), startDate, endDate, minAmount, maxAmount, hasOriginalImage=true|false`
Ordered `DateTime DESC, ID DESC`. No pagination.
Response: `200 { success, data: [...], count }`
Examples:
```bash
curl "http://localhost:3000/api/sales/get?theme=wed&minAmount=100"
curl "http://localhost:3000/api/sales/get?id=5"
```

### PUT /api/sales/update — Update sale
Body: `{ "id": 5, "ThemeName?": "...", "Amount?": 699, "PhotoURL?": "...", "OriginalImageURL?": "...", "DateTime?": "..." }`
`id` required numeric, at least one allowed field. Sets `UpdatedAt=CURRENT_TIMESTAMP`.
Responses: `200 { success, message, data, updatedFields }` | `400/404/500`.
```bash
curl -X PUT http://localhost:3000/api/sales/update \
 -H "Content-Type: application/json" -d '{"id":5,"Amount":699}'
```

### GET /api/sales/stats — Dashboard stats
Query: `period=month|day` (default `month`). `week/year` accepted but return empty trends.
Response `200`:
```json
{ "success": true, "stats": {
  "total": { "count": 10, "total": 4990 },
  "byTheme": [{ "ThemeName":"Wedding","count":4,"total":2000 }],
  "recent": [ ...10 rows ],
  "trends": [...]
}}
```
```bash
curl "http://localhost:3000/api/sales/stats?period=day"
```

---

## 2. Cashfree PG Checkout (UPI / Card / Netbanking)

Flow: `create-order` → `payment_session_id` → `Cashfree({mode:'production'}).checkout({paymentSessionId})` → redirect to `order_meta.return_url` → verify via `GET order` / `GET payments` / webhook.

### POST /api/payments/create-order — Create PG order
Body:
```json
{
  "order_amount": 99,
  "order_currency": "INR",
  "order_id": "optional-custom-id-max50",
  "customer_details": {
    "customer_id": "demo_user_1",
    "customer_phone": "9999999999",
    "customer_email": "a@b.com",
    "customer_name": "Asha"
  },
  "order_meta": {
    "return_url": "https://www.dimensionxgaming.com/?order_id={order_id}",
    "notify_url": "https://your-public-host/api/payments/webhook",
    "payment_methods": "cc,dc,upi,nb"
  },
  "order_note": "optional"
}
```
Required: `order_amount>0`, `customer_details.customer_id`, `customer_details.customer_phone` (10–15 digits).
Success `200 { success:true, data: { order_id, cf_order_id, payment_session_id, order_status, ... } }`. Save `order_id` + use `payment_session_id` in SDK.
Frontend:
```js
const cashfree = window.Cashfree({ mode: 'production' });
await cashfree.checkout({ paymentSessionId: out.data.payment_session_id, redirectTarget: '_self' });
```

### GET /api/payments/order?order_id=XXX — Order status
Use after `return_url` redirect to confirm `order_status == PAID`.
Response `200 { success:true, data: { order_id, order_status, order_amount, ... } }`
```bash
curl "http://localhost:3000/api/payments/order?order_id=ORDER123"
```

### GET /api/payments/payments?order_id=XXX — Payment attempts
Lists method-wise attempts (upi/card/nb).
Response `200 { success:true, data: [...] }`

### POST /api/payments/webhook — Cashfree notify_url
Headers from Cashfree: `x-webhook-timestamp`, `x-webhook-signature` (HMAC_SHA256(timestamp+rawBody, clientSecret) base64). Handler verifies, logs `{order_id, order_amount, payment_status}`, returns `200 {success:true}`. TODO in code: persist PAID to DB.
Configure `notify_url` in `order_meta` to public URL. Test with Cashfree dashboard webhook simulator.

---

## 3. Cashfree Payment Links

Flow: `POST /api/createPaymentLink` → open `link_url` → customer pays → redirect to `link_meta.return_url` → verify via `GET getPaymentLinkDetails`.

### POST /api/createPaymentLink — Create link
Proxies body to `POST /pg/links`. Typical body (see `cashfree-demo-client/src/App.jsx`):
```json
{
  "link_amount": 99,
  "link_currency": "INR",
  "link_purpose": "Test payment demo_user_1",
  "customer_details": { "customer_phone": "9999999999", "customer_email": "a@b.com", "customer_name": "demo_user_1" },
  "link_meta": { "return_url": "https://www.dimensionxgaming.com/?link_id={link_id}" },
  "link_expiry_time": "2026-09-28T10:00:00.000Z"
}
```
Success: Cashfree object passthrough `{ link_url, link_id / cf_link_id, link_status, ... }`. Current default redirect: `https://www.dimensionxgaming.com/?link_id={link_id}`.

### GET /api/getPaymentLinkDetails?link_id=XXX — Link status
Response: Cashfree link object (`link_status`, `link_amount_paid`, etc.). Check `link_status == PAID`.
```bash
curl "http://localhost:3000/api/getPaymentLinkDetails?link_id=LINK123"
```

---

## Error shape
- Sales/PG-order: `{ success:false, error, details? }`
- Link routes: `{ error, details? }`
- 404: `{ success:false, error:'Not found' }`

## Common pitfalls
1. `payment_session_id_invalid` on checkout → SDK `mode` ≠ backend env. Backend is prod → use `mode:'production'`.
2. `return_url` must be public `https://`; `localhost` won't work in prod.
3. Phone must be `^[0-9]{10,15}$`.
4. Webhook needs raw-body signature; current code does `JSON.stringify(req.body)` — must receive unmodified JSON.
