const orderService = require('../services/order.service');

async function list(req, res, next) {
  try {
    res.json(await orderService.listOrders());
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await orderService.getOrder(req.params.id));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

async function pay(req, res, next) {
  try {
    const order = await orderService.payOrder(req.params.id, req.body);
    res.json(order);
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    res.json(await orderService.cancelOrder(req.params.id));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, pay, cancel };
