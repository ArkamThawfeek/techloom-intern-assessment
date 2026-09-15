const { pool } = require('../config/db');

const LIST_COLUMNS = `
  id, name, description, category, price, stock, created_at, updated_at,
  CASE WHEN image_data IS NOT NULL THEN CONCAT('/products/', id, '/image') ELSE NULL END AS image_url
`;

async function search({ q, category, minPrice, maxPrice, availableOnly }) {
  const clauses = [];
  const params = [];

  if (q) {
    clauses.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (minPrice !== undefined) {
    clauses.push('price >= ?');
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    clauses.push('price <= ?');
    params.push(maxPrice);
  }
  if (availableOnly) {
    clauses.push('stock > 0');
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT ${LIST_COLUMNS} FROM products ${where} ORDER BY id ASC`, params);
  return rows;
}

async function listCategories() {
  const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
  return rows.map((r) => r.category);
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(`SELECT ${LIST_COLUMNS} FROM products WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function getImage(id) {
  const [rows] = await pool.query('SELECT image_data, image_mime FROM products WHERE id = ?', [id]);
  const row = rows[0];
  if (!row || !row.image_data) return null;
  return { data: row.image_data, mime: row.image_mime || 'application/octet-stream' };
}

async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO products (name, description, category, price, stock, image_data, image_mime) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      data.name,
      data.description || '',
      data.category || 'general',
      data.price,
      data.stock,
      data.imageData || null,
      data.imageData ? data.imageMime : null
    ]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  const fields = ['name = ?', 'description = ?', 'category = ?', 'price = ?', 'stock = ?'];
  const values = [data.name, data.description || '', data.category || 'general', data.price, data.stock];

  if (data.imageData !== undefined) {
    fields.push('image_data = ?', 'image_mime = ?');
    values.push(data.imageData, data.imageData ? data.imageMime : null);
  }

  values.push(id);
  await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
}

async function reserveStock(conn, productId, quantity) {
  const [result] = await conn.query(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [quantity, productId, quantity]
  );
  return result.affectedRows === 1;
}

async function releaseStock(conn, productId, quantity) {
  await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
}

module.exports = {
  search, listCategories, findById, getImage, create, update, remove, reserveStock, releaseStock
};
