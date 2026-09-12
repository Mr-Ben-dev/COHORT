import { CohortError, ErrorCode } from './errors.mjs';
import { PUBLIC_NETWORK_PINS } from './pins.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

export { PUBLIC_NETWORK_PINS, FORBIDDEN_PUBLIC_NET } from './pins.mjs';
export { CohortError, ErrorCode } from './errors.mjs';
export { ProveLifecycle, assertPrivateFactsShape } from './types.mjs';
export { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

function notImplemented(name) {
  throw new CohortError(
    ErrorCode.NOT_IMPLEMENTED,
    `${name} is not wired yet (Phase 1 types/pins only).`,
  );
}

/**
 * Primary interface the future frontend will consume.
 * Phase 1: pins + typed errors only. Wallet/prove/submit land in Phases 3–6.
 */
export const CohortDapp = Object.freeze({
  pins: PUBLIC_NETWORK_PINS,
  claims: PROVE_ELIGIBLE_CLAIMS,
  connectWallet: () => notImplemented('connectWallet'),
  disconnectWallet: () => notImplemented('disconnectWallet'),
  getWalletState: () => notImplemented('getWalletState'),
  getNetworkState: () => notImplemented('getNetworkState'),
  getTrials: () => notImplemented('getTrials'),
  getTrial: () => notImplemented('getTrial'),
  checkEligibility: () => notImplemented('checkEligibility'),
  proveEligibility: () => notImplemented('proveEligibility'),
  getProofStatus: () => notImplemented('getProofStatus'),
  getTransactionStatus: () => notImplemented('getTransactionStatus'),
  getPublicVerification: () => notImplemented('getPublicVerification'),
  getReferralState: () => notImplemented('getReferralState'),
});
