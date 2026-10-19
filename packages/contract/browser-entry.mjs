/**
 * Browser entry for the compiled-contract simulator bundle.
 *
 * Re-exports the managed build AND the compact-runtime instance it is
 * bundled with as __compactRuntime. Consumers MUST use
 * contractModule.__compactRuntime for createConstructorContext /
 * createCircuitContext / sampleContractAddress — mixing a second copy of
 * the runtime (e.g. the app's own node_modules copy) breaks the runtime's
 * internal type checks (dual-package hazard).
 */
export * from './managed/cohort/contract/index.js';
import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
export { __compactRuntime };
