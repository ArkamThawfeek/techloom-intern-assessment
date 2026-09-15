const AppError = require('../utils/AppError');

function requireCustomerId(req, res, next) {
  const customerId = req.header('X-Customer-Id');
  if (!customerId) {
    return next(new AppError('X-Customer-Id header is required', 400, 'MISSING_CUSTOMER_ID'));
  }
  req.customerId = customerId;
  next();
}

module.exports = { requireCustomerId };
