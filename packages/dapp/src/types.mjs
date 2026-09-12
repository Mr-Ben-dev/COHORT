/**
 * Frontend handoff contract (non-visual). The future `web` folder calls these
 * shapes. Midnight internals stay inside packages/dapp.
 */

export const ProveLifecycle = Object.freeze({
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  PREPARING: 'PREPARING',
  PROVING: 'PROVING',
  WAITING_FOR_WALLET: 'WAITING_FOR_WALLET',
  SUBMITTING: 'SUBMITTING',
  CONFIRMING: 'CONFIRMING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
});

/** Private patient facts. Must never be serialized onto COHORT HTTP. */
export function assertPrivateFactsShape(facts) {
  if (!facts || typeof facts !== 'object') return false;
  return (
    typeof facts.age === 'number' &&
    typeof facts.condition === 'boolean' &&
    typeof facts.medication === 'boolean'
  );
}
