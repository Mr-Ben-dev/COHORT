import { CohortError, ErrorCode } from './errors.mjs';
import { connectWallet as connectOneAmWallet } from './wallet.mjs';

/**
 * COHORT wallet matrix: GeroWallet primary, 1AM fallback, Lace flagged.
 *
 * Detection follows the Midnight DApp Connector API v4 discovery model:
 * wallets inject their InitialAPI under `window.midnight`, each keyed by a
 * *freshly generated UUID rather than a fixed name* (docs.midnight.network,
 * "Connect a React DApp to a wallet"). The API type carries `rdns` (CAIP-372),
 * `name`, `icon`, `apiVersion` for standardized discovery.
 *
 * Sources (verified 2026-10-19):
 * - https://docs.midnight.network/api-reference/dapp-connector
 *   (`window.midnight.{someWalletIdString}`; InitialAPI.connect(networkId);
 *   ConnectedAPI.getConfiguration / getShieldedAddresses / getDustBalance /
 *   getConnectionStatus / hintUsage)
 * - https://docs.midnight.network/guides/react-wallet-connect
 *   (enumerate `Object.values(window.midnight)`; connect('preprod'))
 * - https://docs.midnight.network/relnotes/dapp-connector-api/dapp-connector-api-4-0-0
 *   (v4: `getProvingProvider(keyMaterialProvider)` replaces proverServerUri)
 * - https://gerowallet.io/midnight-wallet/ (GeroWallet Midnight page: dApp
 *   session side panel "proves, funds and submits"; proof-location choice:
 *   "Gero Cloud, a local proof server on your own machine, or Arkhia zkPaaS";
 *   passkey or password unlock; cross-device proving is end-to-end encrypted)
 * - https://gerowallet.io/download/ (GeroWallet 2.7.2)
 *
 * NOT independently verified (marked UNVERIFIED below, not asserted as fact):
 * - GeroWallet's exact `rdns` / injected `name` string — no fixed key is
 *   documented; detection below matches the case-insensitive substring
 *   "gero" across inject key + rdns + name, per the UUID-keying model.
 * - Whether GeroWallet's ConnectedAPI exposes `getProvingProvider`; detection
 *   treats pre-connect proving status as a best-effort heuristic on the
 *   injected object, exactly like the existing 1AM path in wallet.mjs.
 * - Any claim about fee sponsorship at zero DUST — GeroWallet documents
 *   in-wallet DUST generation/registration only.
 *
 * TRUST BOUNDARY (see docs/wallet-trust.md): GeroWallet's *default* proof
 * location is Gero Cloud, so witness data leaves the user's device. For
 * clinical-trial data that must be disclosed; the privacy-sensitive path is
 * 1AM (in-extension WASM proving, witnesses stay local) or Gero's local
 * proof-server switch (verified to exist on gerowallet.io/midnight-wallet/).
 *
 * The existing 1AM path is NOT changed: connectWallet('1am') delegates to
 * wallet.mjs's connectWallet (the battle-tested gold path).
 */

export const WALLET_IDS = ['gero', '1am', 'lace'];

export const LACE_NO_PROVING_MESSAGE =
  'Lace is detected, but Lace does not implement in-browser proving: it exposes no getProvingProvider ' +
  '(Docker proof-server path only). COHORT does not route proving flows through Lace.';

export const GERO_CLOUD_PROVING_NOTE =
  'GeroWallet routes zero-knowledge proving through Gero Cloud by default: witness data leaves the device. ' +
  'For clinical-trial data use Gero\'s local proof-server switch or 1AM (in-extension proving, witnesses stay local).';

export const GERO_NOT_INSTALLED_MESSAGE =
  'GeroWallet is not injected in this browser. Install the GeroWallet extension (2.7.x), create or import a ' +
  'Midnight wallet (passkey unlock is supported), then refresh this tab.';

export const ONE_AM_NOT_INSTALLED_MESSAGE =
  '1AM is not injected in this browser. Install the 1AM extension, then refresh this tab.';

function midnightGlobal() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.window?.midnight || globalThis.midnight || null;
}

/**
 * Classify an injected entry by inject key + rdns + name (CAIP-372 model).
 * No fixed key is asserted for GeroWallet — "gero" substring match across the
 * three fields (see UNVERIFIED note above).
 */
export function classifyWalletId(injectKey, api) {
  const hay = `${String(injectKey || '')} ${String(api?.rdns || '')} ${String(api?.name || '')}`.toLowerCase();
  if (hay.includes('gero')) return 'gero';
  if (injectKey === '1am' || hay.includes('1am') || hay.includes('com.midnight.1am')) return '1am';
  if (injectKey === 'mnLace' || hay.includes('lace') || hay.includes('io.lace')) return 'lace';
  return null;
}

export function findInjectedWallet(id, midnight) {
  const mid = midnight === undefined ? midnightGlobal() : midnight;
  if (!mid || typeof mid !== 'object') return null;
  if (id === 'lace' && mid.mnLace) return mid.mnLace;
  for (const [key, api] of Object.entries(mid)) {
    if (api && typeof api === 'object' && classifyWalletId(key, api) === id) return api;
  }
  return null;
}

function isConnectable(api) {
  return Boolean(api) && (typeof api.connect === 'function' || typeof api.enable === 'function');
}

function hasProvingHook(api) {
  // Best-effort pre-connect heuristic on the injected object, same convention
  // as discoverWallets() in wallet.mjs. Post-connect truth is read from the
  // ConnectedAPI (see connectWallet / getProvingProvider below).
  return Boolean(api) && typeof api.getProvingProvider === 'function';
}

/**
 * Fixed three-row matrix. `available` = injected + connectable.
 * `proving` = best-effort pre-connect heuristic (lace: always false).
 * Pass `{ midnight }` in tests to inject a mocked window.midnight.
 */
export function detectWallets({ midnight } = {}) {
  const mid = midnight === undefined ? midnightGlobal() : midnight;
  const gero = findInjectedWallet('gero', mid);
  const oneAm = findInjectedWallet('1am', mid);
  const lace = findInjectedWallet('lace', mid);
  return [
    { id: 'gero', available: isConnectable(gero), proving: hasProvingHook(gero) },
    { id: '1am', available: isConnectable(oneAm), proving: hasProvingHook(oneAm) },
    { id: 'lace', available: isConnectable(lace), proving: false },
  ];
}

/**
 * Fallback ordering: gero -> 1am -> null (lace never selected for proving).
 */
export function preferredWalletId({ midnight } = {}) {
  const rows = detectWallets({ midnight });
  const gero = rows[0];
  const oneAm = rows[1];
  if (gero.available && gero.proving) return 'gero';
  if (oneAm.available && oneAm.proving) return '1am';
  return null;
}

async function connectGeroWallet({ networkId = 'preprod', midnight } = {}) {
  const mid = midnight === undefined ? midnightGlobal() : midnight;
  const api = findInjectedWallet('gero', mid);
  if (!isConnectable(api)) {
    throw new CohortError(ErrorCode.WALLET_UNAVAILABLE, GERO_NOT_INSTALLED_MESSAGE);
  }
  const connected = typeof api.connect === 'function' ? await api.connect(networkId) : await api.enable();
  if (!connected || typeof connected !== 'object') {
    throw new CohortError(ErrorCode.WALLET_UNAVAILABLE, 'GeroWallet did not return a connected API.');
  }
  const proving = typeof connected.getProvingProvider === 'function';
  if (!proving) {
    throw new CohortError(
      ErrorCode.WALLET_NO_PROVING,
      'GeroWallet connected but did not expose getProvingProvider. Use 1AM for this flow.',
    );
  }
  return { id: 'gero', api: connected, networkId, proving: true, trustNote: GERO_CLOUD_PROVING_NOTE };
}

export async function connectWallet(id, { networkId = 'preprod', midnight } = {}) {
  switch (id) {
    case 'gero':
      return connectGeroWallet({ networkId, midnight });
    case '1am':
      // Existing 1AM path, untouched: same behavior as wallet.mjs connectWallet.
      return { id: '1am', ...(await connectOneAmWallet({ networkId, preferred: '1am' })) };
    case 'lace':
      throw new CohortError(ErrorCode.WALLET_NO_PROVING, LACE_NO_PROVING_MESSAGE);
    default:
      throw new CohortError(
        ErrorCode.WALLET_UNAVAILABLE,
        `Unknown wallet id '${String(id)}'. Known ids: gero, 1am, lace.`,
      );
  }
}

/**
 * Connect and return the proving entry point for the chosen wallet.
 * Lace refuses by design (see LACE_NO_PROVING_MESSAGE).
 */
export async function getProvingProvider(id, opts = {}) {
  if (id === 'lace') {
    throw new CohortError(ErrorCode.WALLET_NO_PROVING, LACE_NO_PROVING_MESSAGE);
  }
  const session = await connectWallet(id, opts);
  const api = session.api;
  if (typeof api?.getProvingProvider !== 'function') {
    throw new CohortError(ErrorCode.WALLET_NO_PROVING, `Connected ${id} wallet does not expose getProvingProvider.`);
  }
  return { api, getProvingProvider: api.getProvingProvider.bind(api), session };
}
