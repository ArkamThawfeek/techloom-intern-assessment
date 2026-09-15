const express = require('express');
const controller = require('../controllers/order.controller');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.post('/:id/pay', controller.pay);
router.post('/:id/cancel', controller.cancel);

module.exports = router;
