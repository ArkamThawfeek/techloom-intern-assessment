// Vercel serverless entry point. Vercel invokes this per-request instead of
// calling app.listen() — the Express app itself handles routing.
// The node-cron background worker from server.js is intentionally NOT
// started here (serverless functions don't stay alive to run it) — see
// the /cron/expire route in app.js instead.
require('dotenv').config();
module.exports = require('../src/app');