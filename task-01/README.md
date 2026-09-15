# Task 01 — POS Order & Inventory System

**Repo:** https://github.com/ArkamThawfeek/techloom-intern-assessment
**Live deployment:** https://task-01-orpin.vercel.app

## Stack

- Backend: Node.js + Express, MySQL (mysql2), node-cron for the background job that expires old reservations
- Frontend: React 18 + Vite
- Deployment: the backend also serves the frontend's build folder, so one URL handles both the UI and the API (no separate frontend hosting needed)

## What's in the UI

Dark sidebar admin layout, 4 sections (I dropped Settings since there was nothing to actually put there):

- **Dashboard** — quick counts (products, orders, reserved, revenue) and a stock levels table sorted lowest first
- **Products** — add/edit/delete from a modal. If a product already has orders against it, delete is blocked with a message instead of just failing — you're told to set stock to 0 instead
- **POS / New order** — pick products, checkout shows an itemized receipt with a countdown for the reservation. "Pay now" disables itself when the countdown hits 0. Going "Back to cart" actually cancels the reservation and puts the items back in your cart instead of just hiding the screen
- **Payment step** — Success/Failure buttons always work. Timeout stays disabled until the countdown really reaches zero — didn't want a fake "simulate timeout" button since that's not how a real reservation window behaves
- **Orders** — list with search + pagination, click into any order to see its status history

## Setup

### 1. Database

```bash
mysql -u root -e "CREATE DATABASE pos_db;"
mysql -u root pos_db < backend/migrations/schema.sql
```

This seeds a few demo products, including a "Limited Edition Mug" with only 3 in stock — used it to test concurrent orders (see below).

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in your DB_HOST / DB_USER / DB_PASSWORD / DB_NAME
npm install
npm start              # runs on http://localhost:4000
```

Env vars:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `RESERVATION_MINUTES` | how long a reservation lasts before it expires (default 5) |
| `EXPIRY_SWEEP_SECONDS` | how often the background job checks for expired reservations (default 30) |
| `CORS_ORIGIN` | allowed origin for local frontend dev |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

For production, `npm run build` builds into `frontend/dist`, and the backend serves it directly — no separate deploy needed for the frontend.

## How I tested each feature

**Products CRUD:** Add/edit/delete from the Products tab. If a product has no orders yet, delete works right away. If it's already been ordered, you get a message instead of a silent error.

**Stock reservation under concurrency:** Add the "Air Jordan 4 Retro Bred" (3 in stock) to cart from two browser tabs and check out at the same time, or run this:

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:4000/orders -H "Content-Type: application/json" \
    -d "{\"items\":[{\"productId\":3,\"quantity\":1}],\"idempotencyKey\":\"test-$i\"}" &
done; wait
```

Only 3 of these should succeed, the rest get `409 OUT_OF_STOCK`, and stock never goes negative.

**Idempotency:** Send the same `idempotencyKey` twice to `POST /orders` — second call just returns the original order (`"duplicate": true`) instead of reserving stock again. Same thing applies to `POST /orders/:id/pay`. UI shows this as a "Duplicate order detected" popup.

**Reservation expiry:** Place an order and don't pay. After `RESERVATION_MINUTES` passes, the background job marks it `EXPIRED` and gives the stock back. You can watch the countdown on the order page, or just check `GET /orders/:id` after waiting.

**Payment outcomes:** Success/Failure work immediately from the Payment screen. Timeout is greyed out until the real countdown hits zero — once it does, the order auto-expires with no click needed. To test Failure/Timeout quickly without waiting on the real clock:

```bash
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" -d '{"mode":"FAILURE","idempotencyKey":"test-1"}'
curl -X POST http://localhost:4000/orders/<id>/pay -H "Content-Type: application/json" -d '{"mode":"TIMEOUT","idempotencyKey":"test-2"}'
```

**Invalid transitions:** Try paying for an order that's already `PAID`/`FAILED`/`EXPIRED`/`CANCELLED` — you get `409 INVALID_TRANSITION`. Valid moves are `RESERVED → PAID/FAILED/EXPIRED/CANCELLED` and `PAID → CANCELLED`.

**Cancellation:** Works on `RESERVED` and `PAID` orders, restores stock either way and marks the order `CANCELLED`.

## A few notes on how it's built

- Stock updates go through one atomic query: `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`. If it updates 0 rows, there wasn't enough stock — didn't need to add explicit locking, and it still works fine wrapped in a transaction for multi-item orders.
- All the valid order status moves are in `src/utils/orderStateMachine.js` and get checked before any status change, so a bad transition just fails instead of quietly messing up the data.
- Expiry is handled two ways — a `node-cron` job every `EXPIRY_SWEEP_SECONDS`, and also a check whenever an order gets read or paid. That way even if a request comes in right between sweeps, it still sees the correct status.
