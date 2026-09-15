const { pool } = require('../config/db');

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, price, stock }) {
  const [result] = await pool.query(
    'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
    [name, price, stock]
  );
  return findById(result.insertId);
}

async function update(id, { name, price, stock }) {
  await pool.query(
    'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
    [name, price, stock, id]
  );
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
}

// Atomically decrements stock only if enough is available.
// Returns true if the decrement succeeded, false if there wasn't enough stock.
async function reserveStock(conn, productId, quantity) {
  const [result] = await conn.query(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [quantity, productId, quantity]
  );
  return result.affectedRows === 1;
}

// Restores stock, e.g. on cancellation, failure, or expiry.
async function releaseStock(conn, productId, quantity) {
  await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
}

module.exports = { listAll, findById, create, update, remove, reserveStock, releaseStock };
