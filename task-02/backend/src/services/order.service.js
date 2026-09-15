const { v4: uuidv4 } = require('uuid');
const { withTransaction } = require('../config/db');
const productRepo = require('../repositories/product.repository');
const orderRepo = require('../repositories/order.repository');
const cartRepo = require('../repositories/cart.repository');
const AppError = require('../utils/AppError');
const { assertTransition } = require('../utils/orderStateMachine');
const { simulatePayment } = require('./paymentGateway.service');

const RESERVATION_MINUTES = Number(process.env.RESERVATION_MINUTES) || 5;

function reservationExpiryDate() {
  return new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
}

async function hydrateOrder(order) {
  const items = await orderRepo.getItems(order.id);
  const refund = await orderRepo.getRefund(order.id);
  return { ...order, items, refund: refund || null };
}

async function getOrder(orderId, customerId) {
  const order = await orderRepo.findById(orderId);
  if (!order || order.customer_id !== customerId) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }
  const fresh = await expireIfDue(order);
  return hydrateOrder(fresh);
}

async function listOrders(customerId) {
  return orderRepo.listByCustomer(customerId);
}

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

// Converts the customer's current cart into a reserved order (checkout).
async function checkout(customerId, idempotencyKey) {
  const key = idempotencyKey || uuidv4();
  const existing = await orderRepo.findByIdempotencyKey(key);
  if (existing) {
    // Same checkout submitted again — return the original order, don't reserve twice.
    const fresh = await expireIfDue(existing);
    return hydrateOrder(fresh);
  }

  const cart = await cartRepo.getOrCreateCart(customerId);
  const cartItems = await cartRepo.getItems(cart.id);
  if (cartItems.length === 0) {
    throw new AppError('Cart is empty', 400, 'EMPTY_CART');
  }

  const orderId = await withTransaction(async (conn) => {
    let total = 0;

    for (const item of cartItems) {
      const product = await productRepo.findById(item.product_id, conn);
      if (!product) throw new AppError(`Product ${item.product_id} not found`, 404, 'NOT_FOUND');

      const reserved = await productRepo.reserveStock(conn, item.product_id, item.quantity);
      if (!reserved) {
        throw new AppError(`Insufficient stock for "${product.name}"`, 409, 'OUT_OF_STOCK');
      }
      total += Number(product.price) * item.quantity;
    }

    const newOrderId = await orderRepo.createOrder(conn, {
      customerId,
      totalAmount: total,
      idempotencyKey: key,
      expiresAt: reservationExpiryDate()
    });

    for (const item of cartItems) {
      const product = await productRepo.findById(item.product_id, conn);
      await orderRepo.addOrderItem(conn, {
        orderId: newOrderId,
        productId: item.product_id,
        quantity: item.quantity,
        priceAtPurchase: Number(product.price)
      });
    }

    return newOrderId;
  });

  await cartRepo.clear(cart.id);
  return getOrder(orderId, customerId);
}

async function payOrder(orderId, customerId, { idempotencyKey, mode } = {}) {
  if (idempotencyKey) {
    const existingPayment = await orderRepo.findPaymentByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      return getOrder(existingPayment.order_id, customerId);
    }
  }

  let order = await orderRepo.findById(orderId);
  if (!order || order.customer_id !== customerId) throw new AppError('Order not found', 404, 'NOT_FOUND');

  order = await expireIfDue(order);
  if (order.status !== 'RESERVED') {
    throw new AppError(`Cannot pay for an order in status ${order.status}`, 409, 'INVALID_TRANSITION');
  }

  const items = await orderRepo.getItems(orderId);
  const outcome = simulatePayment(mode);
  const key = idempotencyKey || uuidv4();

  await withTransaction(async (conn) => {
    const fresh = await orderRepo.findById(orderId, conn);
    const nextStatus = outcome.status === 'SUCCESS' ? 'PAID' : outcome.status === 'FAILURE' ? 'FAILED' : 'EXPIRED';
    assertTransition(fresh.status, nextStatus);

    await orderRepo.createPayment(conn, { orderId, status: outcome.status, idempotencyKey: key });

    if (outcome.status === 'SUCCESS') {
      await orderRepo.updateStatus(conn, orderId, 'PAID', { expiresAt: null });
    } else {
      for (const item of items) {
        await productRepo.releaseStock(conn, item.product_id, item.quantity);
      }
      await orderRepo.updateStatus(conn, orderId, nextStatus, { expiresAt: null });
    }
  });

  return getOrder(orderId, customerId);
}

// Cancels an order. If it had already been paid, also simulates a refund.
async function cancelOrder(orderId, customerId) {
  const order = await orderRepo.findById(orderId);
  if (!order || order.customer_id !== customerId) throw new AppError('Order not found', 404, 'NOT_FOUND');

  assertTransition(order.status, 'CANCELLED');
  const wasPaid = order.status === 'PAID';

  await withTransaction(async (conn) => {
    const items = await orderRepo.getItems(orderId, conn);
    for (const item of items) {
      await productRepo.releaseStock(conn, item.product_id, item.quantity);
    }
    await orderRepo.updateStatus(conn, orderId, 'CANCELLED', { expiresAt: null });

    if (wasPaid) {
      await orderRepo.createRefund(conn, { orderId, amount: order.total_amount });
    }
  });

  return getOrder(orderId, customerId);
}

module.exports = { checkout, payOrder, cancelOrder, getOrder, listOrders };
