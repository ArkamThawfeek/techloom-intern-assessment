const orderService = require('../services/order.service');

async function list(req, res, next) {
  try {
    res.json(await orderService.listOrders(req.customerId));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await orderService.getOrder(req.params.id, req.customerId));
  } catch (err) { next(err); }
}

async function checkout(req, res, next) {
  try {
    const order = await orderService.checkout(req.customerId, req.body.idempotencyKey);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

async function pay(req, res, next) {
  try {
    res.json(await orderService.payOrder(req.params.id, req.customerId, req.body));
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    res.json(await orderService.cancelOrder(req.params.id, req.customerId));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, checkout, pay, cancel };
