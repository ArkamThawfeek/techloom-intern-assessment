// Simulates a real payment gateway's possible outcomes.
// `forceMode` exists for API-level testing (curl/Postman) — the customer-facing UI never sends it.
//
// Without a forced mode, the gateway only ever returns SUCCESS or FAILURE. TIMEOUT is
// deliberately excluded from natural randomness: it happens only when the actual 5-minute
// reservation clock runs out before payment completes, not as a simulated gateway hiccup.
function simulatePayment(forceMode) {
  const modes = ['SUCCESS', 'FAILURE', 'TIMEOUT'];
  if (forceMode && modes.includes(forceMode)) {
    return { status: forceMode };
  }

  const roll = Math.random();
  return { status: roll < 0.85 ? 'SUCCESS' : 'FAILURE' };
}

module.exports = { simulatePayment };
