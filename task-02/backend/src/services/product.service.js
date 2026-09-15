const productRepo = require('../repositories/product.repository');
const AppError = require('../utils/AppError');

function validateProductInput({ name, price, stock, imageData }) {
  if (!name || typeof name !== 'string') throw new AppError('name is required', 400);
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    throw new AppError('price must be a non-negative number', 400);
  }
  if (typeof stock !== 'number' || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    throw new AppError('stock must be a non-negative integer', 400);
  }
  if (imageData !== undefined && imageData !== null && !Buffer.isBuffer(imageData)) {
    throw new AppError('imageData must be a file buffer', 400);
  }
}

async function searchProducts(query) {
  const { q, category } = query;
  const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;
  const availableOnly = query.availableOnly === 'true';
  return productRepo.search({ q, category, minPrice, maxPrice, availableOnly });
}

async function listCategories() {
  return productRepo.listCategories();
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
  await productRepo.remove(id);
}

module.exports = {
  searchProducts, listCategories, getProduct, createProduct, updateProduct, deleteProduct
};
