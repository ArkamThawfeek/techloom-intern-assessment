const { pool } = require('../config/db');

async function findByIdempotencyKey(idempotencyKey, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM orders WHERE idempotency_key = ?', [idempotencyKey]);
  return rows[0] || null;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
  return rows[0] || null;
}

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY id DESC');
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

async function createOrder(conn, { totalAmount, idempotencyKey, expiresAt }) {
  const [result] = await conn.query(
    `INSERT INTO orders (status, total_amount, idempotency_key, expires_at)
     VALUES ('RESERVED', ?, ?, ?)`,
    [totalAmount, idempotencyKey, expiresAt]
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

async function findPaymentsForOrder(orderId, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM payments WHERE order_id = ?', [orderId]);
  return rows;
}

async function createPayment(conn, { orderId, status, idempotencyKey }) {
  await conn.query(
    `INSERT INTO payments (order_id, status, idempotency_key) VALUES (?, ?, ?)`,
    [orderId, status, idempotencyKey]
  );
}

module.exports = {
  findByIdempotencyKey,
  findById,
  listAll,
  getItems,
  createOrder,
  addOrderItem,
  updateStatus,
  findExpiredReservations,
  findPaymentByIdempotencyKey,
  findPaymentsForOrder,
  createPayment
};
