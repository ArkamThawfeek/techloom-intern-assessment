const cron = require('node-cron');
const { withTransaction } = require('../config/db');
const orderRepo = require('../repositories/order.repository');
const productRepo = require('../repositories/product.repository');

async function sweepExpiredReservations() {
  const expired = await orderRepo.findExpiredReservations();

  for (const order of expired) {
    try {
      await withTransaction(async (conn) => {
        const fresh = await orderRepo.findById(order.id, conn);
        if (fresh.status !== 'RESERVED') return;

        const items = await orderRepo.getItems(order.id, conn);
        for (const item of items) {
          await productRepo.releaseStock(conn, item.product_id, item.quantity);
        }
        await orderRepo.updateStatus(conn, order.id, 'EXPIRED', { expiresAt: null });
      });
      console.log(`[expiry-worker] order ${order.id} expired, stock released`);
    } catch (err) {
      console.error(`[expiry-worker] failed to expire order ${order.id}:`, err.message);
    }
  }
}

function startExpiryWorker() {
  const seconds = Number(process.env.EXPIRY_SWEEP_SECONDS) || 30;
  const cronExpr = `*/${seconds} * * * * *`;
  cron.schedule(cronExpr, sweepExpiredReservations);
  console.log(`[expiry-worker] scheduled every ${seconds}s`);
}

module.exports = { startExpiryWorker, sweepExpiredReservations };
