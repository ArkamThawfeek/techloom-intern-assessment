# Techloom.ai — Software Engineer Intern Assessment

**Repository:** https://github.com/ArkamThawfeek/techloom-intern-assessment
**Task 01 live demo:** https://task-01-orpin.vercel.app
**Task 02 live demo:** https://task-02-lyart.vercel.app

Both tasks are separate Node.js/Express + MySQL projects, each with its own React frontend served by its own backend. Both default to port 4000 in `.env` — since they're deployed as two separate services this isn't an issue in production; if running both locally at the same time, override `PORT` for one of them. See each folder's README for setup and testing instructions.

## /task-01 — POS Order & Inventory System

A point-of-sale backend with an admin dashboard: product management (each product gets a code like `P0001`), a live stock levels view, cart/checkout with an enforced stock-reservation timer, a mock payment flow (Success/Failure/Timeout), and full order lifecycle handling with idempotency protection against duplicate submissions. Prices shown in Rupees (Rs.).

→ [task-01/README.md](./task-01/README.md)

## /task-02 — E-Commerce Checkout & Payment System (ShopMate)

A storefront built on the same reservation/payment/lifecycle logic as Task 01, plus live product search, product photos stored directly in the database, a multi-step checkout with working back navigation, toast notifications, and a "Manage products" admin screen. Prices shown in Rupees (Rs.).

→ [task-02/README.md](./task-02/README.md)

## Shared design decisions

- **Concurrency:** stock is reserved with a single atomic `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` inside a transaction — no explicit row locking, and it composes cleanly for multi-item orders.
- **Idempotency:** checkout and payment calls accept a client-generated `idempotencyKey`; resubmitting the same key returns the original result instead of double-reserving or double-charging.
- **Order lifecycle:** a single transition map (`RESERVED → PAID/FAILED/EXPIRED/CANCELLED`, `PAID → CANCELLED`) is checked before every status change, so invalid transitions are rejected with `409` instead of corrupting state.
- **Reservation expiry:** enforced via a `node-cron` background sweep plus a lazy check-on-read, so a stale `RESERVED` order self-heals to `EXPIRED` the moment anything reads it. Both frontends disable Pay/Process once the on-screen countdown hits zero.
- **Back navigation:** leaving checkout partway through releases the reservation and restores the cart server-side, instead of leaving stock locked under an abandoned order.
- **Product images (Task 02):** stored as binary data (`LONGBLOB`) in the database, served through a dedicated route.
- **Payment outcomes:** Timeout is never a manual toggle — it's a function of the real reservation clock. `FAILURE` and `TIMEOUT` remain testable via the API with an explicit `mode`.

## Testing tips

Each schema seeds a low-stock item for exercising the no-overselling/concurrency behavior — see each README for a ready-to-run `curl` loop.
