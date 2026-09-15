const cartService = require('../services/cart.service');

async function view(req, res, next) {
  try {
    res.json(await cartService.viewCart(req.customerId));
  } catch (err) { next(err); }
}

async function addItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;
    res.json(await cartService.addItem(req.customerId, productId, quantity));
  } catch (err) { next(err); }
}

async function removeItem(req, res, next) {
  try {
    res.json(await cartService.removeItem(req.customerId, req.params.productId));
  } catch (err) { next(err); }
}

module.exports = { view, addItem, removeItem };
