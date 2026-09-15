# Techloom.ai — Software Engineer Intern Assessment

**Repository:** https://github.com/ArkamThawfeek/techloom-intern-assessment
**Task 01 live deployment:** https://task-01-orpin.vercel.app
**Task 02 live deployment:** https://task-02-lyart.vercel.app

Both tasks are self-contained Node.js/Express + MySQL projects, each with its own React frontend served by its own backend. Both default to **port 4000** — since they're deployed as two separate services, that's not a conflict in production; if you want to run both locally at the same time, override `PORT` for one of them via its `.env`. See each folder's README for full setup and testing instructions.

## /task-01 — POS Order & Inventory System

A concurrency-safe point-of-sale backend with a dark-sidebar admin UI: product management (each product shown with a unique code, e.g. P0001), a live "Stock levels" dashboard showing every product's actual count, a cart/checkout flow with a real and enforced stock-reservation countdown (including a "Back to cart" that genuinely releases the reservation and restores your items instead of abandoning them), a mock payment simulator where Success/Failure are always available but Timeout only unlocks once the real clock runs out, and full order lifecycle handling with an idempotency guard against duplicate submissions. Prices are shown in Rupees (Rs.).

→ [task-01/README.md](./task-01/README.md)

## /task-02 — E-Commerce Checkout & Payment System

A guest-session storefront ("ShopMate") built on the same reservation/payment/lifecycle patterns as Task 01, plus live product search, product photos stored directly in the database, a multi-step checkout with working back navigation on both the shipping and payment steps (the shipping step's back button genuinely releases the reservation and restores your cart, same as Task 01), toast notifications for quick actions, and refund simulation on cancelled paid orders. Prices are shown in Rupees (Rs.); products are identified by a unique code (e.g. P0001) alongside their name. Includes a "Manage products" admin screen (not required by the brief, but added since the storefront needs a way to add/edit products beyond the seeded demo data).

→ [task-02/README.md](./task-02/README.md)

## Shared design decisions

- **Concurrency:** both tasks reserve stock with a single atomic `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` inside a transaction — no explicit row locking needed, and it composes cleanly for multi-item orders (all-or-nothing).
- **Idempotency:** every checkout and payment call accepts a client-generated `idempotencyKey`; resubmitting the same key returns the original result instead of double-reserving stock or double-charging.
- **Order lifecycle:** a single transition map (`RESERVED → PAID/FAILED/EXPIRED/CANCELLED`, `PAID → CANCELLED`) is checked before every status change in both backends, so invalid transitions are rejected with a `409` rather than silently corrupting state.
- **Reservation expiry is genuinely enforced, not just displayed:** a `node-cron` background sweep plus a lazy check-on-every-read mean the backend self-heals a stale `RESERVED` order into `EXPIRED` the moment anything reads it. Both frontends disable their Pay/Process buttons the instant the on-screen countdown hits zero, too.
- **"Back" buttons don't just switch views — they actually release the reservation:** in both systems, leaving checkout partway through cancels the order server-side and hands the items back to the cart, so stock never sits silently locked under an abandoned order that the UI no longer shows.
- **Product codes:** each product's existing unique database id is formatted into a human-readable code (`P0001`, `P0002`, ...) purely for display — no schema change needed, since the id was already guaranteed unique.
- **Currency:** all prices display in Rupees (`Rs.`) rather than dollars.
- **Product images (Task 02 only):** stored as actual binary data (`LONGBLOB`) in the database and served through a dedicated route — not disk files, not pasted URLs. See task-02's README for the full flow.
- **Payment outcomes:** Timeout is never a manual simulated toggle in either system — it's purely a function of the real reservation clock. In Task 01, Success/Failure remain selectable at any time, but Timeout is visibly locked until the clock genuinely reaches zero. In Task 02, there's no picker at all — Success/Failure happen through the gateway's own non-deterministic logic. In both, `FAILURE` and `TIMEOUT` remain fully testable via the API with an explicit `mode`, so every path the assessment evaluates is still verifiable.
- **Search (Task 02 only):** the Browse page filters live as you type — no Enter key needed — and clearing the box restores the full catalog immediately.
- **Notifications (Task 02 only):** quick actions (cart add/remove) show as small auto-dismissing toasts; bigger outcomes (payment result, cancellation, duplicate order) keep the existing modal, since those need a deliberate acknowledgment.

## Testing tips that apply to both

- Each schema seeds a low-stock item (Task 01's "Limited Edition Mug", Task 02's "Desk Lamp") specifically for exercising the no-overselling / concurrency behavior — see each README for a ready-to-run `curl` loop.
