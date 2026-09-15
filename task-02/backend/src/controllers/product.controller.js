const productService = require('../services/product.service');
const productRepo = require('../repositories/product.repository');
const AppError = require('../utils/AppError');

async function search(req, res, next) {
  try {
    res.json(await productService.searchProducts(req.query));
  } catch (err) { next(err); }
}

async function categories(req, res, next) {
  try {
    res.json(await productService.listCategories());
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await productService.getProduct(req.params.id));
  } catch (err) { next(err); }
}

function parseProductBody(req) {
  const body = {
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    price: req.body.price !== undefined ? Number(req.body.price) : undefined,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined
  };

  if (req.file) {
    body.imageData = req.file.buffer;
    body.imageMime = req.file.mimetype;
  } else if (req.body.removeImage === 'true') {
    body.imageData = null; // explicit removal
  }
  // else: imageData stays undefined — service/repo interpret that as "leave unchanged"

  return body;
}

async function create(req, res, next) {
  try {
    res.status(201).json(await productService.createProduct(parseProductBody(req)));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await productService.updateProduct(req.params.id, parseProductBody(req)));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function image(req, res, next) {
  try {
    const img = await productRepo.getImage(req.params.id);
    if (!img) throw new AppError('No image for this product', 404, 'NOT_FOUND');
    res.set('Content-Type', img.mime);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(img.data);
  } catch (err) { next(err); }
}

module.exports = { search, categories, getOne, create, update, remove, image };
