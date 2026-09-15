const path = require('path');
const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const cartRoutes = require('./routes/cart.routes');
const AppError = require('./utils/AppError');
const { sweepExpiredReservations } = require('./jobs/expireReservations.job');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', exposedHeaders: ['X-Customer-Id'] }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);

// Serverless hosts (Vercel) have no long-running node-cron process, so this
// endpoint lets a platform Cron Job trigger the same expiry sweep instead.
// Reservation correctness doesn't depend on this route firing on a fixed
// schedule though — order.repository's lazy check-on-read already expires a
// stale RESERVED order the moment anything reads it.
app.get('/cron/expire', async (req, res, next) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await sweepExpiredReservations();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Serve the built React frontend (single deployment covers API + UI).
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/(products|orders|cart|health|cron)).*/, (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — every controller forwards errors here via next(err).
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;