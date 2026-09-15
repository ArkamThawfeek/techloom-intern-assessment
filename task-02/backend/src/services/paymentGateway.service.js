function simulatePayment(forceMode) {
  const modes = ['SUCCESS', 'FAILURE', 'TIMEOUT'];
  if (forceMode && modes.includes(forceMode)) {
    return { status: forceMode };
  }

  const roll = Math.random();
  return { status: roll < 0.85 ? 'SUCCESS' : 'FAILURE' };
}

module.exports = { simulatePayment };
