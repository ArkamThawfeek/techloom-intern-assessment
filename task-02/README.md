# Task 02 — E-Commerce Checkout & Payment System

**Repo:** (add your GitHub URL here)
**Live deployment:** (add your Render/Railway/Fly.io URL here)

## Stack

- Backend: Node.js + Express, MySQL (mysql2), node-cron for the background expiry worker
- Frontend: React 18 + Vite, lucide-react icons — a "ShopMate" storefront
- Deployment: the backend serves the frontend's production build as static files, so one URL covers both the UI and the API

## Guest sessions

There's no login system — the frontend generates a random customer id on first visit (stored in `localStorage`) and sends it as an `X-Customer-Id` header on every request. That's what scopes a cart and order history to "a shopper" without building auth.

## UI overview

- **Browse** — search, category/price/availability filters, sort by name or price
- **Product details** — description, stock, quantity picker, add to cart
- **Cart** — qty steppers, subtotal/total, proceed to checkout
- **Checkout, step 1 (Shipping)** — a shipping address form (collected for display only — not persisted anywhere, since nothing in the assessment requires storing customer PII) alongside the live stock-reservation countdown for the order that was just created. "Back to cart" genuinely releases the reservation and re-adds the items to your cart — it doesn't just switch views and leave stock silently locked.
- **Checkout, step 2 (Payment)** — only the mock gateway is enabled (the other two payment methods are shown but honestly labeled as unavailable). There's no manual "pick an outcome" control: clicking "Process payment" goes through the gateway's own non-deterministic logic (mostly succeeds, sometimes fails — see "Payment outcomes" below), and a live countdown on this screen ties into the same real reservation clock as the shipping step, so running out of time here resolves to a genuine timeout automatically. "Back" returns to the shipping step for the same order (no cancellation needed there, since it's still the same live reservation).
- **Order detail** — items, shipping address (when available in the current session), payment info, a lifecycle timeline, and cancel-with-refund
- **Order history** — status tabs and a list of past orders
- **Manage products** — the assessment brief doesn't require a seller-facing product management screen for Task 02 (unlike Task 01), but the backend fully supports product CRUD, so a lightweight admin page is included under the "Manage products" nav tab so the storefront isn't limited to whatever was seeded in `schema.sql`. Product photos are uploaded directly from your computer and stored in the database — see "Product images" below.
- **Notifications** — quick actions (add to cart, remove from cart) surface as small auto-dismissing toasts so they don't interrupt shopping; bigger outcomes (payment result, cancellation, duplicate order) still use a modal that needs a deliberate dismiss, since those carry more weight.

## Payment outcomes

The Payment step deliberately has no visible "choose an outcome" control — that was replaced with logic that behaves like a real gateway:

- **Success or failure** happen naturally when you click "Process payment" — the gateway (`paymentGateway.service.js`) picks between them itself (~85% success, ~15% failure) each time, with no way to force one from the UI.
- **Timeout** is not something the gateway can produce at all anymore. It happens exclusively when the real 5-minute reservation clock runs out before payment completes — tracked by the same countdown shown on the Checkout and Payment screens. If it hits zero while you're sitting on either screen, the order resolves to `EXPIRED` and the matching notice appears automatically, with no click required.

**For testing/review purposes**, both Failure and Timeout remain fully reachable via the API with an explicit `mode`, even though the UI never sends one:

```bash
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" \
  -H "X-Customer-Id: <any-id>" -d '{"mode":"FAILURE","idempotencyKey":"test-1"}'

curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" \
  -H "X-Customer-Id: <any-id>" -d '{"mode":"TIMEOUT","idempotencyKey":"test-2"}'
```

This keeps every path the assessment evaluates ("success, failure, and timeout cases are all handled correctly") genuinely testable, without exposing a developer-facing toggle to real shoppers.

## Product images

Sellers upload a photo file directly from their computer via the "Manage products" form, and it's stored as actual binary data in the database — not on disk, and not as a pasted URL. The flow:

1. The browser sends the product's text fields plus the image file together as one `multipart/form-data` request to `POST /products` (create) or `PUT /products/:id` (update).
2. The backend (`multer`, in-memory — never touches disk) validates it's a JPEG/PNG/WEBP/GIF under 5MB, then writes the raw bytes into the `products.image_data` column (`LONGBLOB`) alongside its MIME type.
3. Product listing/detail responses never include the raw bytes (that would bloat every page load) — they include a computed `image_url` field like `/products/7/image` only when an image exists. That route is a dedicated endpoint that reads the blob back out and serves it with the correct `Content-Type`.

Every place an image appears (Browse, Product Details, Cart, Manage Products) renders it through a shared `ProductImage` component that falls back to a placeholder icon if there's no photo or it fails to load — so a missing image never breaks the layout. Because storage lives entirely in MySQL, there's no disk-persistence caveat to worry about on redeploy — the image travels with the rest of your data.

## Setup

### 1. Database

```bash
mysql -u root -e "CREATE DATABASE ecom_db;"
mysql -u root ecom_db < backend/migrations/schema.sql
```

Seeds six demo products across four categories (electronics, home, accessories, stationery), including a 4-unit "Desk Lamp" useful for concurrency testing.

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DB_HOST / DB_USER / DB_PASSWORD / DB_NAME
npm install
npm start              # http://localhost:4000
```

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `RESERVATION_MINUTES` | Stock hold duration before expiry (default 5) |
| `EXPIRY_SWEEP_SECONDS` | Background worker interval (default 30) |
| `CORS_ORIGIN` | Allowed origin for local frontend dev |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173, proxies /products, /cart, /orders to :4000
```

`npm run build` outputs to `frontend/dist`, which the backend serves automatically — no separate deployment needed.

## How to test each feature

**Product discovery:** Browse page — search by name, filter by category/price/availability, sort by name or price. `GET /products?q=&category=&minPrice=&maxPrice=&availableOnly=true`.

**Cart & checkout:** Add items from Browse or a product page, adjust quantities in the cart, then "Proceed to checkout" — this immediately reserves stock (`POST /orders/checkout`) and shows the shipping step with a live 5-minute countdown.

**Stock reservation & concurrency:** Same atomic-update pattern as Task 01 — try adding more of the 4-unit Desk Lamp than is available, or fire concurrent checkout requests, to confirm no overselling.

**Duplicate checkout:** Resubmitting the same `idempotencyKey` to `/orders/checkout` returns the original order (`"duplicate": true`) instead of reserving twice — surfaced in the UI as a "Duplicate order detected" notice.

**Mock payment outcomes:** On the Payment step, click "Process payment" — the gateway decides Success or Failure itself (no manual picker). Success marks the order `PAID`; Failure releases the reserved stock (`FAILED`) and shows the order-detail banner with a "Try again" action. To reliably see a Failure (since it's only ~15% likely per click), or to test Timeout without waiting 5 real minutes, use the API directly with an explicit `mode` — see "Payment outcomes" above.

**Timeout specifically:** let the countdown on the Checkout or Payment screen run out (or shorten `RESERVATION_MINUTES` locally for faster testing) — the order resolves to `EXPIRED` and the matching notice appears with zero clicks needed.

**Refund & cancellation:** Cancel a `PAID` order from its detail page — stock is restored and a refund record is created automatically (`order.refund`), shown in the timeline as a "Refunded" step. Cancelling a still-`RESERVED` order just releases stock, no refund needed.

**Order history:** "My orders" — filter by status tab, open any order to see its full detail and timeline.

## Design notes

- Products, orders, and payments follow the same transaction-safe pattern as Task 01 (`UPDATE products SET stock = stock - ? WHERE stock >= ?`), reused here rather than reinvented.
- Every order read (not just payment attempts) self-heals a stale `RESERVED` order into `EXPIRED` if its clock has passed — so the UI never shows a countdown at `00:00` while the backend still thinks the order is active. The background `node-cron` sweep exists as a backstop for orders nobody's actively looking at.
- The shipping address is intentionally client-side only — it's shown in the checkout confirmation and immediately after payment, but won't reappear if you revisit the order later from history, since it was never sent to the backend.
- Refunds are modeled as their own table (`refunds`) rather than an order status, since a cancelled order can either have been paid (needs a refund) or merely reserved (doesn't).
