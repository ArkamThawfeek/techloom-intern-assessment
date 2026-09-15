const { pool } = require('../config/db');

async function getOrCreateCart(customerId) {
  const [rows] = await pool.query('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
  if (rows[0]) return rows[0];

  const [result] = await pool.query('INSERT INTO carts (customer_id) VALUES (?)', [customerId]);
  return { id: result.insertId, customer_id: customerId };
}

async function getItems(cartId) {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.stock,
     CASE WHEN p.image_data IS NOT NULL THEN CONCAT('/products/', p.id, '/image') ELSE NULL END AS image_url
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?`,
    [cartId]
  );
  return rows;
}

async function upsertItem(cartId, productId, quantity) {
  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = ?`,
    [cartId, productId, quantity, quantity]
  );
}

async function removeItem(cartId, productId) {
  await pool.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
}

async function clear(cartId) {
  await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
}

module.exports = { getOrCreateCart, getItems, upsertItem, removeItem, clear };
