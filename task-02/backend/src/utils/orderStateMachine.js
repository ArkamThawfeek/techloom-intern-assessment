const AppError = require('./AppError');

const TRANSITIONS = {
  RESERVED: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PAID: ['CANCELLED'],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: []
};

function assertTransition(currentStatus, nextStatus) {
  const allowed = TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Cannot move order from ${currentStatus} to ${nextStatus}`,
      409,
      'INVALID_TRANSITION'
    );
  }
}

// Statuses where stock has already been released back to inventory.
const STOCK_RELEASED_STATUSES = ['FAILED', 'EXPIRED', 'CANCELLED'];

module.exports = { TRANSITIONS, assertTransition, STOCK_RELEASED_STATUSES };
