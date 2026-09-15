const cartRepo = require('../repositories/cart.repository');
const productRepo = require('../repositories/product.repository');
const AppError = require('../utils/AppError');

async function viewCart(customerId) {
  const cart = await cartRepo.getOrCreateCart(customerId);
  const items = await cartRepo.getItems(cart.id);
  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  return { cartId: cart.id, items, total };
}

async function addItem(customerId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('quantity must be a positive integer', 400);
  }
  const product = await productRepo.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const cart = await cartRepo.getOrCreateCart(customerId);
  await cartRepo.upsertItem(cart.id, productId, quantity);
  return viewCart(customerId);
}

async function removeItem(customerId, productId) {
  const cart = await cartRepo.getOrCreateCart(customerId);
  await cartRepo.removeItem(cart.id, productId);
  return viewCart(customerId);
}

module.exports = { viewCart, addItem, removeItem };
