const { v4: uuidv4 } = require('uuid');
const { pool, withTransaction } = require('../config/db');
const productRepo = require('../repositories/product.repository');
const orderRepo = require('../repositories/order.repository');
const AppError = require('../utils/AppError');
const { assertTransition } = require('../utils/orderStateMachine');
const { simulatePayment } = require('./paymentGateway.service');

const RESERVATION_MINUTES = Number(process.env.RESERVATION_MINUTES) || 5;

function reservationExpiryDate() {
  return new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
}

async function hydrateOrder(order) {
  const items = await orderRepo.getItems(order.id);
  return { ...order, items };
}

async function getOrder(orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  const fresh = await expireIfDue(order);
  return hydrateOrder(fresh);
}

async function listOrders() {
  return orderRepo.listAll();
}

// Lazily expires a reservation if its window has passed but the sweep job hasn't run yet.
// Keeps behaviour correct even if a request lands between sweep intervals.
async function expireIfDue(order) {
  if (order.status !== 'RESERVED' || !order.expires_at) return order;
  if (new Date(order.expires_at) > new Date()) return order;

  return withTransaction(async (conn) => {
    const fresh = await orderRepo.findById(order.id, conn);
    if (fresh.status !== 'RESERVED') return fresh;
    const items = await orderRepo.getItems(order.id, conn);
    for (const item of items) {
      await productRepo.releaseStock(conn, item.product_id, item.quantity);
    }
    await orderRepo.updateStatus(conn, order.id, 'EXPIRED', { expiresAt: null });
    return orderRepo.findById(order.id, conn);
  });
}

async function createOrder({ items, idempotencyKey }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array', 400);
  }
  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new AppError('each item needs a valid productId and a positive integer quantity', 400);
    }
  }

  const key = idempotencyKey || uuidv4();
  const existing = await orderRepo.findByIdempotencyKey(key);
  if (existing) {
    // Same cart submitted again — return the original order instead of reserving twice.
    const fresh = await expireIfDue(existing);
    const hydrated = await hydrateOrder(fresh);
    return { ...hydrated, duplicate: true };
  }

  const orderId = await withTransaction(async (conn) => {
    let total = 0;
    const priced = [];

    for (const item of items) {
      const product = await productRepo.findById(item.productId, conn);
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');

      const reserved = await productRepo.reserveStock(conn, item.productId, item.quantity);
      if (!reserved) {
        throw new AppError(
          `Insufficient stock for product "${product.name}"`,
          409,
          'OUT_OF_STOCK'
        );
      }

      total += Number(product.price) * item.quantity;
      priced.push({ ...item, price: Number(product.price) });
    }

    const newOrderId = await orderRepo.createOrder(conn, {
      totalAmount: total,
      idempotencyKey: key,
      expiresAt: reservationExpiryDate()
    });

    for (const item of priced) {
      await orderRepo.addOrderItem(conn, {
        orderId: newOrderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price
      });
    }

    return newOrderId;
  });

  const created = await getOrder(orderId);
  return { ...created, duplicate: false };
}

async function payOrder(orderId, { idempotencyKey, mode } = {}) {
  if (idempotencyKey) {
    const existingPayment = await orderRepo.findPaymentByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      // Same payment attempt submitted again — return the original outcome, don't recharge.
      return getOrder(existingPayment.order_id);
    }
  }

  let order = await orderRepo.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  order = await expireIfDue(order);
  if (order.status !== 'RESERVED') {
    throw new AppError(
      `Cannot pay for an order in status ${order.status}`,
      409,
      'INVALID_TRANSITION'
    );
  }

  const items = await orderRepo.getItems(orderId);
  const outcome = simulatePayment(mode);
  const key = idempotencyKey || uuidv4();

  await withTransaction(async (conn) => {
    const fresh = await orderRepo.findById(orderId, conn);
    assertTransition(fresh.status, outcome.status === 'SUCCESS' ? 'PAID' : outcome.status === 'FAILURE' ? 'FAILED' : 'EXPIRED');

    await orderRepo.createPayment(conn, { orderId, status: outcome.status, idempotencyKey: key });

    if (outcome.status === 'SUCCESS') {
      await orderRepo.updateStatus(conn, orderId, 'PAID', { expiresAt: null });
    } else {
      for (const item of items) {
        await productRepo.releaseStock(conn, item.product_id, item.quantity);
      }
      const nextStatus = outcome.status === 'FAILURE' ? 'FAILED' : 'EXPIRED';
      await orderRepo.updateStatus(conn, orderId, nextStatus, { expiresAt: null });
    }
  });

  return getOrder(orderId);
}

async function cancelOrder(orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  assertTransition(order.status, 'CANCELLED');

  await withTransaction(async (conn) => {
    const items = await orderRepo.getItems(orderId, conn);
    for (const item of items) {
      await productRepo.releaseStock(conn, item.product_id, item.quantity);
    }
    await orderRepo.updateStatus(conn, orderId, 'CANCELLED', { expiresAt: null });
  });

  return getOrder(orderId);
}

module.exports = { createOrder, payOrder, cancelOrder, getOrder, listOrders };
