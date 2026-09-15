const { pool } = require('../config/db');

async function findByIdempotencyKey(idempotencyKey, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM orders WHERE idempotency_key = ?', [idempotencyKey]);
  return rows[0] || null;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
  return rows[0] || null;
}

async function listByCustomer(customerId) {
  const [rows] = await pool.query(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC',
    [customerId]
  );
  return rows;
}

async function getItems(orderId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT oi.*, p.name AS product_name
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  return rows;
}

async function createOrder(conn, { customerId, totalAmount, idempotencyKey, expiresAt }) {
  const [result] = await conn.query(
    `INSERT INTO orders (customer_id, status, total_amount, idempotency_key, expires_at)
     VALUES (?, 'RESERVED', ?, ?, ?)`,
    [customerId, totalAmount, idempotencyKey, expiresAt]
  );
  return result.insertId;
}

async function addOrderItem(conn, { orderId, productId, quantity, priceAtPurchase }) {
  await conn.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
     VALUES (?, ?, ?, ?)`,
    [orderId, productId, quantity, priceAtPurchase]
  );
}

async function updateStatus(conn, orderId, status, extra = {}) {
  const fields = ['status = ?'];
  const values = [status];
  if ('expiresAt' in extra) {
    fields.push('expires_at = ?');
    values.push(extra.expiresAt);
  }
  values.push(orderId);
  await conn.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function findExpiredReservations(conn = pool) {
  const [rows] = await conn.query(
    `SELECT * FROM orders WHERE status = 'RESERVED' AND expires_at IS NOT NULL AND expires_at < NOW()`
  );
  return rows;
}

async function findPaymentByIdempotencyKey(idempotencyKey, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM payments WHERE idempotency_key = ?', [idempotencyKey]);
  return rows[0] || null;
}

async function createPayment(conn, { orderId, status, idempotencyKey }) {
  await conn.query(
    `INSERT INTO payments (order_id, status, idempotency_key) VALUES (?, ?, ?)`,
    [orderId, status, idempotencyKey]
  );
}

async function createRefund(conn, { orderId, amount }) {
  await conn.query(
    `INSERT INTO refunds (order_id, amount, status) VALUES (?, ?, 'SUCCESS')`,
    [orderId, amount]
  );
}

async function getRefund(orderId, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM refunds WHERE order_id = ?', [orderId]);
  return rows[0] || null;
}

module.exports = {
  findByIdempotencyKey,
  findById,
  listByCustomer,
  getItems,
  createOrder,
  addOrderItem,
  updateStatus,
  findExpiredReservations,
  findPaymentByIdempotencyKey,
  createPayment,
  createRefund,
  getRefund
};
