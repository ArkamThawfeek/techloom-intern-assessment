const productService = require('../services/product.service');

async function list(req, res, next) {
  try {
    res.json(await productService.listProducts());
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await productService.getProduct(req.params.id));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await productService.updateProduct(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
