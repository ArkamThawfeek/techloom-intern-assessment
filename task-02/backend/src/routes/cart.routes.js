const express = require('express');
const controller = require('../controllers/cart.controller');
const { requireCustomerId } = require('../middleware/customer');

const router = express.Router();

router.use(requireCustomerId);
router.get('/', controller.view);
router.post('/items', controller.addItem);
router.delete('/items/:productId', controller.removeItem);

module.exports = router;
