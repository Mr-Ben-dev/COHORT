/**
 * Browser entry for the gold path. Bundled to apps/web/cohort-dapp.js.
 * Midnight internals stay in this package; the stub UI only calls CohortDapp.
 */
export { CohortDapp, ErrorCode, CohortError } from './index.mjs';
// Wave-3: wallet detection (GeroWallet primary, 1AM fallback) and the truth
// gate are part of the browser bundle so web/ routes import them from the
// prebuilt /dapp/cohort-dapp.js instead of relative ../../../packages paths
// (which do not exist when Vercel builds with rootDirectory=web).
export {
  WALLET_IDS,
  GERO_CLOUD_PROVING_NOTE,
  detectWallets,
  preferredWalletId,
  connectWallet,
} from './wallets.mjs';
export {
  truthGatedCall,
  waitForLedgerEffect,
  isClaimedSuccess,
  isClaimedFailure,
  assertClaimedSuccess,
} from './truth-gate.mjs';
export { proveEligibility as proveEligibilityViaWallet } from './prove.mjs';
