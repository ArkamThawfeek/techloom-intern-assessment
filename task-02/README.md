# Task 02 — E-Commerce Checkout & Payment System (ShopMate)

**Live deployment:** https://task-02-lyart.vercel.app

## Stack

- Backend: Node.js + Express, MySQL (mysql2), node-cron for the background expiry job
- Frontend: React 18 + Vite — a small storefront called "ShopMate"
- Deployment: the backend also serves the frontend build, so one URL covers both UI and API

## Guest sessions

No login here — the frontend just generates a random customer id on first visit (kept in `localStorage`) and sends it as an `X-Customer-Id` header on every request. That's enough to scope a cart and order history to one shopper without building full auth.

## What's in the UI

- **Browse** — search, filters (category/price/availability), sort by name or price
- **Product details** — description, stock, quantity picker, add to cart
- **Cart** — change quantities, see subtotal/total, proceed to checkout
- **Checkout step 1 (Shipping)** — a shipping form (not saved anywhere, just shown for display since nothing in the brief needed real customer data stored) plus the live reservation countdown. "Back to cart" actually releases the reservation and puts the items back in the cart instead of leaving stock stuck.
- **Checkout step 2 (Payment)** — only the mock gateway works (the other two are shown but marked unavailable). No "pick an outcome" button — clicking "Process payment" goes through the gateway's own logic (mostly succeeds, sometimes fails). Same countdown carries over from the shipping step, so running out of time here also resolves to a real timeout. "Back" goes to shipping for the same order.
- **Order detail** — items, shipping info (if it's still in this session), payment info, status timeline, cancel + refund
- **Order history** — past orders with status tabs
- **Manage products** — not required by the brief for this task, but the backend already supports full product CRUD, so I added a simple admin page for it — otherwise the store would be stuck with only whatever's in `schema.sql`. Product photos are uploaded straight from your computer and saved in the database. Deleting a product removes it from any in-progress carts automatically, but is blocked with a message if it already has order history.
- **Notifications** — small toasts for quick actions (add/remove from cart), modals for bigger stuff (payment result, cancellation, duplicate order) since those need an actual dismiss.

## Payment outcomes

There's no visible "pick an outcome" control on the Payment step on purpose — it's built to behave more like a real gateway:

- **Success/Failure** happen when you click "Process payment" — `paymentGateway.service.js` decides on its own (roughly 85% success, 15% failure), no way to force one from the UI.
- **Timeout** only happens when the real 5-minute reservation clock runs out before payment finishes. If it hits zero while you're on either checkout screen, the order goes to `EXPIRED` automatically.

For testing without waiting on the real gateway odds or the real clock, both are reachable directly through the API with an explicit `mode`:

```bash
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" \
  -H "X-Customer-Id: <any-id>" -d '{"mode":"FAILURE","idempotencyKey":"test-1"}'

curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" \
  -H "X-Customer-Id: <any-id>" -d '{"mode":"TIMEOUT","idempotencyKey":"test-2"}'
```

## Product images

Sellers upload a photo from their computer through "Manage products," and it's stored as actual binary data in MySQL — not on disk, not a pasted URL. Flow:

1. Browser sends the product's text fields + image file together as `multipart/form-data` to `POST /products` or `PUT /products/:id`.
2. Backend (`multer`, kept in memory, never touches disk) checks it's a JPEG/PNG/WEBP/GIF under 5MB, then saves the raw bytes into `products.image_data` (`LONGBLOB`) along with its MIME type.
3. Listing/detail responses don't include the raw bytes directly — they get a computed `image_url` like `/products/7/image` when an image exists, and that route serves the blob back with the right `Content-Type`.

Every screen that shows an image (Browse, Product Details, Cart, Manage Products) uses one shared `ProductImage` component that falls back to a placeholder if there's no photo, so nothing breaks visually if an image is missing. Since it's all stored in MySQL, there's nothing to lose on redeploy — images travel with the rest of the data.

## Setup

### 1. Database

```bash
mysql -u root -e "CREATE DATABASE ecom_db;"
mysql -u root ecom_db < backend/migrations/schema.sql
```

Seeds a set of demo products (baby/kids category — car seat, feeding chair, playpen, blanket, etc.). Pick whichever one currently has the lowest stock in your database for the concurrency test below (check via the Manage Products page or `GET /products`).

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DB_HOST / DB_USER / DB_PASSWORD / DB_NAME
npm install
npm start              # http://localhost:4000
```

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `RESERVATION_MINUTES` | how long stock is held before it expires (default 5) |
| `EXPIRY_SWEEP_SECONDS` | background job interval (default 30) |
| `CORS_ORIGIN` | allowed origin for local frontend dev |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

`npm run build` outputs to `frontend/dist`, and the backend serves it directly — no separate frontend deploy needed.

## How I tested each feature

**Product discovery:** Browse page — search, filter by category/price/availability, sort by name or price. `GET /products?q=&category=&minPrice=&maxPrice=&availableOnly=true`.

**Cart & checkout:** Add items, adjust quantities, "Proceed to checkout" — reserves stock right away (`POST /orders/checkout`) and shows the shipping step with a live countdown.

**Stock reservation & concurrency:** Same atomic-update approach as Task 01. Pick a low-stock item (e.g. one of the baby product seeds) and try ordering more than what's available, or fire off concurrent checkout requests, to confirm it never oversells.

**Duplicate checkout:** Resubmit the same `idempotencyKey` to `/orders/checkout` — you get the original order back (`"duplicate": true`) instead of a new reservation. Shown in the UI as a "Duplicate order detected" notice.

**Mock payment outcomes:** Click "Process payment" on the Payment step — gateway decides Success/Failure on its own. Since Failure is only ~15% likely per click, use the API with an explicit `mode` (above) to see it reliably, or to test Timeout without waiting the real 5 minutes.

**Timeout specifically:** let the countdown run out (or lower `RESERVATION_MINUTES` locally for faster testing) — order goes to `EXPIRED` automatically.

**Refund & cancellation:** Cancel a `PAID` order — stock is restored and a refund record gets created automatically, shown in the timeline as "Refunded." Cancelling a `RESERVED` order just releases stock, no refund needed there.

**Order history:** "My orders" — filter by status, open any order for full detail and timeline.

## A few notes on how it's built

- Products/orders/payments use the same transaction-safe stock update as Task 01 (`UPDATE products SET stock = stock - ? WHERE stock >= ?`) — didn't see a reason to build it differently here.
- Every order read (not just payment attempts) checks if a `RESERVED` order's clock has passed and flips it to `EXPIRED` if so — so the UI never shows `00:00` while the backend still thinks it's active. The `node-cron` sweep is just a backstop for orders nobody's actively looking at.
- Shipping address is client-side only on purpose — shown right after checkout/payment, but won't reappear if you come back to the order later from history, since it was never sent to the backend.
- Refunds are their own table (`refunds`), not just an order status, since a cancelled order might have been paid (needs a refund) or only reserved (doesn't).
