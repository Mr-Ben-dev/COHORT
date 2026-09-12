import { CohortError, ErrorCode } from './errors.mjs';
import { PUBLIC_NETWORK_PINS } from './pins.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';
import { readPublicVerification, configureNetwork } from './public-state.mjs';
import { proveEligibility as proveEligibilityImpl } from './prove.mjs';
import {
  connectWallet as connectWalletImpl,
  disconnectWallet as disconnectWalletImpl,
  getWalletState as getWalletStateImpl,
} from './wallet.mjs';
import { getTrials as getTrialsImpl, getTrial as getTrialImpl, checkEligibility as checkEligibilityImpl } from './trials.mjs';
import { getTransactionStatus as getTransactionStatusImpl } from './tx-status.mjs';
import { encodeTrialId } from './encoding.mjs';
import { env } from './env.mjs';

export { PUBLIC_NETWORK_PINS, FORBIDDEN_PUBLIC_NET } from './pins.mjs';
export { CohortError, ErrorCode } from './errors.mjs';
export { ProveLifecycle, assertPrivateFactsShape } from './types.mjs';
export { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';
export { readPublicVerification, configureNetwork, createPublicDataProvider } from './public-state.mjs';
export { discoverWallets } from './wallet.mjs';
export { encodeTrialId } from './encoding.mjs';
export { bindOfficialTrial } from './prove.mjs';

export async function getNetworkState(opts = {}) {
  const verification = await readPublicVerification(opts).catch(() => null);
  return {
    networkId: env('MIDNIGHT_NETWORK', 'preprod'),
    pins: PUBLIC_NETWORK_PINS,
    contractAddress: PROVE_ELIGIBLE_CLAIMS.contractAddress,
    verification,
    publicStateIsNotTruth: true,
    source: verification ? 'midnight-indexer' : 'pins',
  };
}

async function getReferralState(opts = {}) {
  const origin = opts.origin || (typeof globalThis.location?.origin === 'string' ? globalThis.location.origin : null);
  if (!origin) {
    return { events: [], source: 'cohort-memory-cache', notIndexerTruth: true };
  }
  const res = await fetch(`${String(origin).replace(/\/$/, '')}/api/public-state`);
  if (!res.ok) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Optional public referral cache is unavailable.');
  }
  const body = await res.json();
  return { ...body, source: 'cohort-memory-cache', notIndexerTruth: true };
}

/**
 * Primary interface the future frontend will consume.
 * Midnight internals stay in this package. No mock production txs.
 */
export const CohortDapp = Object.freeze({
  pins: PUBLIC_NETWORK_PINS,
  claims: PROVE_ELIGIBLE_CLAIMS,
  connectWallet: (opts) => connectWalletImpl(opts),
  disconnectWallet: () => disconnectWalletImpl(),
  getWalletState: () => getWalletStateImpl(),
  getNetworkState,
  getTrials: (opts) => getTrialsImpl(opts),
  getTrial: (trialId, opts) => getTrialImpl(trialId, opts),
  checkEligibility: (facts, trial) => checkEligibilityImpl(facts, trial),
  proveEligibility: (input) => proveEligibilityImpl(input),
  getProofStatus: (opts) => getTransactionStatusImpl(opts),
  getTransactionStatus: (opts) => getTransactionStatusImpl(opts),
  getPublicVerification: (opts) => readPublicVerification(opts),
  getReferralState,
  encodeTrialId,
  configureNetwork,
});
