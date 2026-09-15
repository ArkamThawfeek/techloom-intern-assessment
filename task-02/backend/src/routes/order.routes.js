const express = require('express');
const controller = require('../controllers/order.controller');
const { requireCustomerId } = require('../middleware/customer');

const router = express.Router();

router.use(requireCustomerId);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/checkout', controller.checkout);
router.post('/:id/pay', controller.pay);
router.post('/:id/cancel', controller.cancel);

module.exports = router;
