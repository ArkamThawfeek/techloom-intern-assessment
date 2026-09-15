const productRepo = require('../repositories/product.repository');
const AppError = require('../utils/AppError');

function validateProductInput({ name, price, stock }) {
  if (!name || typeof name !== 'string') throw new AppError('name is required', 400);
  if (typeof price !== 'number' || price < 0) throw new AppError('price must be a non-negative number', 400);
  if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
    throw new AppError('stock must be a non-negative integer', 400);
  }
}

async function listProducts() {
  return productRepo.listAll();
}

async function getProduct(id) {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

async function createProduct(input) {
  validateProductInput(input);
  return productRepo.create(input);
}

async function updateProduct(id, input) {
  await getProduct(id);
  validateProductInput(input);
  return productRepo.update(id, input);
}

async function deleteProduct(id) {
  await getProduct(id);
  try {
    await productRepo.remove(id);
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      throw new AppError(
        'This product has order history and can\'t be deleted. Set its stock to 0 to take it off sale instead.',
        409,
        'PRODUCT_HAS_ORDERS'
      );
    }
    throw err;
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
