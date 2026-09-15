const express = require('express');
const controller = require('../controllers/product.controller');
const { productImageUpload } = require('../middleware/productImageUpload');
const AppError = require('../utils/AppError');

const router = express.Router();

// errors (bad file type, too large) become normal AppErrors
function withImageUpload(handler) {
  return (req, res, next) => {
    productImageUpload.single('image')(req, res, (err) => {
      if (err) return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
      handler(req, res, next);
    });
  };
}

router.get('/', controller.search);
router.get('/categories', controller.categories);
router.get('/:id/image', controller.image);
router.get('/:id', controller.getOne);
router.post('/', withImageUpload(controller.create));
router.put('/:id', withImageUpload(controller.update));
router.delete('/:id', controller.remove);

module.exports = router;
