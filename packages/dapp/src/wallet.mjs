import { CohortError, ErrorCode } from './errors.mjs';
import { ProveLifecycle } from './types.mjs';

function midnightGlobal() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.window?.midnight || globalThis.midnight || null;
}

export function discoverWallets() {
  const midnight = midnightGlobal();
  if (!midnight || typeof midnight !== 'object') return [];
  return Object.entries(midnight)
    .filter(([, api]) => api && typeof api === 'object')
    .map(([key, api]) => ({
      key,
      apiName: api.name || key,
      rdns: api.rdns || null,
      apiVersion: api.apiVersion || null,
      hasConnect: typeof api.connect === 'function' || typeof api.enable === 'function',
      hasGetProvingProvider: typeof api.getProvingProvider === 'function',
    }));
}

export async function connectWallet({ networkId = 'preprod', preferred = '1am' } = {}) {
  const midnight = midnightGlobal();
  if (!midnight) {
    throw new CohortError(
      ErrorCode.WALLET_UNAVAILABLE,
      'No Midnight DApp Connector is injected. Install 1AM for the public gold path.',
    );
  }
  const wallets = discoverWallets();
  const oneAm = midnight['1am'] || midnight[preferred] || Object.values(midnight).find((w) => typeof w?.getProvingProvider === 'function');
  if (!oneAm) {
    const lace = midnight.mnLace || wallets.find((w) => !w.hasGetProvingProvider);
    if (lace) {
      throw new CohortError(
        ErrorCode.WALLET_NO_PROVING,
        'Lace is present but does not implement getProvingProvider. Use 1AM, or run a local proof-server:8.1.0 for Lace.',
      );
    }
    throw new CohortError(ErrorCode.WALLET_UNAVAILABLE, 'No compatible Midnight wallet with getProvingProvider was found.');
  }
  if (typeof oneAm.connect !== 'function' && typeof oneAm.enable !== 'function') {
    throw new CohortError(ErrorCode.WALLET_UNAVAILABLE, 'Wallet connector has no connect() method.');
  }
  const api = typeof oneAm.connect === 'function' ? await oneAm.connect(networkId) : await oneAm.enable();
  const status = typeof api.getConnectionStatus === 'function' ? api.getConnectionStatus() : {};
  const proving = typeof api.getProvingProvider === 'function';
  if (!proving) {
    throw new CohortError(
      ErrorCode.WALLET_NO_PROVING,
      'Connected wallet does not expose getProvingProvider. COHORT will not send witnesses to a hosted prover.',
    );
  }
  let dust = null;
  if (typeof api.getDustBalance === 'function') {
    try {
      dust = await api.getDustBalance();
    } catch {
      dust = null;
    }
  }
  return {
    lifecycle: ProveLifecycle.CONNECTED,
    apiName: '1am',
    networkId: status.networkId || networkId,
    proving: 'wasm',
    dust,
    api,
  };
}

export function disconnectWallet() {
  return { lifecycle: ProveLifecycle.DISCONNECTED, api: null };
}

export function getWalletState() {
  const wallets = discoverWallets();
  if (!wallets.length) {
    return { lifecycle: ProveLifecycle.DISCONNECTED, wallets };
  }
  return { lifecycle: ProveLifecycle.DISCONNECTED, wallets, injected: true };
}
