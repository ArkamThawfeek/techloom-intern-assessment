# Task 01 — POS Order & Inventory System

**Repo:** (add your GitHub URL here)
**Live deployment:** (add your Render/Railway/Fly.io URL here)

## Stack

- Backend: Node.js + Express, MySQL (mysql2), node-cron for the background expiry worker
- Frontend: React 18 + Vite, lucide-react icons
- Deployment: the backend serves the frontend's production build as static files, so one URL covers both the UI and the API

## UI overview

A dark-sidebar admin layout with four sections (Settings was removed — there was nothing to configure):

- **Dashboard** — live counts (products, orders, reserved orders, paid revenue) and a "Stock levels" panel showing every product's current stock (lowest first), not just a filtered low-stock shortlist
- **Products** — search, table, and a modal form for add/edit/delete. Deleting a product that already has order history is blocked with a clear message (instead of a silent failure) — MySQL's foreign key protects that history, and the message tells the cashier to set stock to 0 to take it off sale instead.
- **POS / New order** — product grid + cart → **Checkout** (itemized receipt with a live, enforced reservation countdown — "Pay now" disables itself the moment it hits zero; "Back to cart" genuinely cancels the reservation and hands your items back so you can add more, rather than abandoning them locked in limbo) → **Payment** (Success/Failure are always selectable; Timeout is visibly disabled until the real countdown actually reaches zero, at which point it's also triggered automatically with no click needed — you can't "simulate" a timeout while time remains, since that wouldn't reflect a real reservation window)
- **Orders** — searchable, paginated list → order detail with a lifecycle timeline (Reserved → Paid/Failed/Expired/Cancelled)
- Result modals surface duplicate-order detection, payment failure, payment timeout, and cancellation outcomes

## Setup

### 1. Database

Create a database and load the schema:

```bash
mysql -u root -e "CREATE DATABASE pos_db;"
mysql -u root pos_db < backend/migrations/schema.sql
```

This also seeds three demo products, including a 3-unit "Limited Edition Mug" that's useful for testing the concurrency behavior.

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DB_HOST / DB_USER / DB_PASSWORD / DB_NAME for your setup
npm install
npm start              # http://localhost:4000
```

Environment variables (`.env`):

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `RESERVATION_MINUTES` | How long a stock reservation holds before it expires (default 5) |
| `EXPIRY_SWEEP_SECONDS` | How often the background worker checks for expired reservations (default 30) |
| `CORS_ORIGIN` | Allowed origin for the frontend during local dev |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173, proxies /products and /orders to :4000
```

For production, `npm run build` outputs to `frontend/dist`, which the backend serves automatically — no separate frontend deployment needed.

## How to test each feature

**Products (CRUD):** Products tab — add, edit, delete. Stock and price update immediately. Deleting a product with no order history removes it instantly; deleting one that's already been ordered is blocked with an explanatory message rather than failing silently.

**Concurrency-safe stock reservation:** From the Shop tab, add the "Limited Edition Mug" (starts at 3 units) to cart and check out from two browser tabs at once, or fire concurrent requests:

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:4000/orders -H "Content-Type: application/json" \
    -d "{\"items\":[{\"productId\":3,\"quantity\":1}],\"idempotencyKey\":\"test-$i\"}" &
done; wait
```

Exactly as many requests succeed as there's stock for; the rest get a `409 OUT_OF_STOCK` response, and the product's stock never goes negative.

**Idempotency / duplicate submission:** Submit the same `idempotencyKey` twice to `POST /orders` — the second call returns the original order (with `"duplicate": true`) instead of reserving stock again; the UI surfaces this as a "Duplicate order detected" modal. Same protection applies to `POST /orders/:id/pay`.

**Stock reservation expiry:** Place an order and don't pay. After `RESERVATION_MINUTES` (5 by default), the background worker releases the stock and marks the order `EXPIRED` — visible via the live countdown on the order detail page, or by checking `GET /orders/:id` after the window passes.

**Mock payment outcomes:** On the Payment screen, pick **Success** or **Failure** and click "Process payment" — both are real, immediate outcomes. **Timeout** is grayed out and unselectable until the actual 5-minute reservation clock reaches zero; once it does, the order resolves to `EXPIRED` automatically (no click required), and by that point "Process payment" has also disabled itself so a stale click can't slip through. To exercise `FAILURE` or `TIMEOUT` directly via the API (useful for fast review/testing without waiting out a real clock):

```bash
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" -d '{"mode":"FAILURE","idempotencyKey":"test-1"}'
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" -d '{"mode":"TIMEOUT","idempotencyKey":"test-2"}'
```

Both release the reserved stock (`FAILED` and `EXPIRED` respectively).

**Order lifecycle / invalid transitions:** Try paying for an order that's already `PAID`, `FAILED`, `EXPIRED`, or `CANCELLED` — the API rejects it with `409 INVALID_TRANSITION`. Valid transitions: `RESERVED → PAID/FAILED/EXPIRED/CANCELLED`, `PAID → CANCELLED`.

**Cancellation:** Cancel button is available on `RESERVED` and `PAID` orders; either restores the reserved/purchased stock and marks the order `CANCELLED`.

## Design notes

- Stock changes use a single atomic `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`. If it affects zero rows, there wasn't enough stock — no explicit row locking needed, and it composes cleanly with a wrapping transaction for multi-item orders (all-or-nothing).
- The order status transition map lives in `src/utils/orderStateMachine.js` and is checked before every status change, so invalid transitions fail loudly instead of silently corrupting state.
- Reservation expiry is handled two ways: a `node-cron` sweep every `EXPIRY_SWEEP_SECONDS`, plus a lazy check whenever an order is read or paid, so a request landing between sweeps still sees correct state.
