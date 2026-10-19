/**
 * COHORT no-wallet verification read path.
 *
 * Client-side (browser) module. Reads public contract counters from the
 * same-origin API — plain fetch, no wallet, no signing, no private data.
 *
 * Provenance contract (the backend owns the `source` string; this module only
 * classifies it):
 *   "live-onchain"       -> provenance "live-onchain"   (numbers are real chain state)
 *   "no-token-configured" (or anything else, or the request failed)
 *                        -> provenance "sample-data"     (numbers are clearly-labeled
 *                           layout placeholders; the result says so explicitly)
 *
 * Never silently mixes: provenance is all-or-nothing for the page. If ANY
 * endpoint fails or reports a non-live source, the whole result is
 * "sample-data" and the sample counters are shown with the badge —
 * live-looking numbers are never blended with placeholder ones.
 *
 * No secrets, no wallet keys, no personal data pass through here.
 */

/** @typedef {'live-onchain' | 'sample-data'} VerifyProvenance */

/**
 * @typedef {Object} VerifyCounters
 * @property {number} proven - eligibility proofs accepted by the contract
 * @property {number} attestationCount - issuer attestations published on-chain
 * @property {number} attestationsVerified - attestations verified on-chain
 * @property {number} referralCount - referral nullifiers minted on-chain
 */

/**
 * @typedef {Object} VerifyState
 * @property {VerifyProvenance} provenance - "live-onchain" | "sample-data"
 * @property {boolean} live - true only when provenance is "live-onchain"
 * @property {string | null} source - raw source string(s) reported by the API
 * @property {string | null} networkId - network reported by the API
 * @property {string | null} contractAddress - contract reported by the API
 * @property {VerifyCounters | null} counters - live counters when live, else null
 * @property {VerifyCounters | null} sample - sample counters when sample-data, else null
 * @property {boolean} isSample - true when the displayed numbers are sample data
 * @property {string | null} error - human-readable reason when degraded, else null
 * @property {string} fetchedAt - ISO timestamp of the classification
 */

export const PROVENANCE_LIVE = 'live-onchain';
export const PROVENANCE_SAMPLE = 'sample-data';

/** Source value the backend returns only when numbers came straight from chain state. */
const LIVE_SOURCE = 'live-onchain';

const PUBLIC_STATE_PATH = '/api/public-state';
const ATTESTATION_COUNTERS_PATH = '/api/attestation-counters';

/**
 * Clearly-labeled layout placeholders. Shown ONLY under provenance
 * "sample-data" with the amber badge. `sampleData: true` marks them so
 * no consumer can mistake them for chain state.
 */
export const SAMPLE_COUNTERS = Object.freeze({
  proven: 142,
  attestationCount: 87,
  attestationsVerified: 63,
  referralCount: 219,
  sampleData: true,
});

/**
 * Classify one backend `source` string.
 * Anything that is not the exact live source string is NOT live.
 *
 * @param {unknown} source
 * @returns {VerifyProvenance}
 */
export function classifyProvenance(source) {
  return source === LIVE_SOURCE ? PROVENANCE_LIVE : PROVENANCE_SAMPLE;
}

/**
 * Coerce an unknown value to a non-negative integer counter, or null.
 * @param {unknown} v
 * @returns {number | null}
 */
function toCounter(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

async function readJsonSafely(res) {
  try {
    const body = await res.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

/**
 * Fetch one endpoint with plain fetch (no wallet, no signing). Returns a
 * normalized record or throws a human-readable Error.
 */
async function readEndpoint(fetchImpl, path) {
  let res;
  try {
    res = await fetchImpl(path, { cache: 'no-store' });
  } catch (err) {
    throw new Error(`could not reach ${path}: ${err?.message || 'network error'}`);
  }
  if (!res || typeof res.json !== 'function') {
    throw new Error(`${path} returned an unreadable response`);
  }
  const body = await readJsonSafely(res);
  if (!res.ok) {
    const detail = typeof body.error === 'string' ? body.error : '';
    throw new Error(
      `${path} returned HTTP ${res.status}${detail ? ` (${detail})` : ''}`,
    );
  }
  return { body };
}

/**
 * Read public counters from both same-origin endpoints and classify the
 * provenance. All-or-nothing: any failure or non-live source demotes the
 * whole result to "sample-data" with an explicit error message.
 *
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<VerifyState>}
 */
export async function fetchVerifyState(options = {}) {
  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const fetchedAt = new Date().toISOString();

  const empty = () => ({
    provenance: PROVENANCE_SAMPLE,
    live: false,
    source: null,
    networkId: null,
    contractAddress: null,
    counters: null,
    sample: { ...SAMPLE_COUNTERS },
    isSample: true,
    error: null,
    fetchedAt,
  });

  if (!fetchImpl) {
    return { ...empty(), error: 'fetch is not available in this environment' };
  }

  let publicState;
  let attestationCounters;
  try {
    publicState = await readEndpoint(fetchImpl, PUBLIC_STATE_PATH);
  } catch (err) {
    return { ...empty(), error: String(err?.message || err) };
  }
  try {
    attestationCounters = await readEndpoint(fetchImpl, ATTESTATION_COUNTERS_PATH);
  } catch (err) {
    return { ...empty(), error: String(err?.message || err) };
  }

  const ps = publicState.body;
  const ac = attestationCounters.body;

  const source = ps.source ?? ac.source ?? null;
  if (classifyProvenance(source) !== PROVENANCE_LIVE) {
    const why =
      typeof source === 'string' && source.length
        ? `backend reported source "${source}" (not "${LIVE_SOURCE}")`
        : 'backend did not report a live source';
    return {
      ...empty(),
      source: typeof source === 'string' ? source : null,
      networkId: typeof ps.networkId === 'string' ? ps.networkId : null,
      contractAddress:
        typeof ps.contractAddress === 'string' ? ps.contractAddress : null,
      error: `${why}. Showing sample numbers for layout only.`,
    };
  }

  const proven = toCounter(ps.proven);
  const referralCount = toCounter(ps.referralCount);
  const attestationCount = toCounter(ac.attestationCount ?? ac.attestations);
  const attestationsVerified = toCounter(
    ac.attestationsVerified ?? ac.verifiedCount,
  );

  if (
    proven === null ||
    referralCount === null ||
    attestationCount === null ||
    attestationsVerified === null
  ) {
    return {
      ...empty(),
      source: LIVE_SOURCE,
      networkId: typeof ps.networkId === 'string' ? ps.networkId : null,
      contractAddress:
        typeof ps.contractAddress === 'string' ? ps.contractAddress : null,
      error:
        'backend reported live-onchain but a counter was missing or not a number. Showing sample numbers for layout only.',
    };
  }

  return {
    provenance: PROVENANCE_LIVE,
    live: true,
    source: LIVE_SOURCE,
    networkId: typeof ps.networkId === 'string' ? ps.networkId : null,
    contractAddress:
      typeof ps.contractAddress === 'string' ? ps.contractAddress : null,
    counters: { proven, attestationCount, attestationsVerified, referralCount },
    sample: null,
    isSample: false,
    error: null,
    fetchedAt,
  };
}
