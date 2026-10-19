/**
 * blockfrost-live.mjs — SQUAD A7
 *
 * Live on-chain ledger counters for GET /api/public-state, served from the
 * Blockfrost-operated Midnight indexer (GraphQL POST, same schema as the
 * retired official Preprod endpoint).
 *
 * The indexer returns a hex-encoded ContractState; ContractState.deserialize
 * gives .data and the generated ledger() decodes the Wave-1 public fields
 * (spent, referrals, proven). Wave-3 fields (attestations, attestationsVerified)
 * are read only when a Wave-3 contract address is configured via
 * CONTRACT_ADDRESS_WAVE3 — the Wave-3 contract is UNDEPLOYED, so until then
 * those counters come back null with an explicit 'not-deployed' label.
 *
 * Graceful degradation rule: when BLOCKFROST_PROJECT_ID is absent, or the
 * query fails, nothing is invented — counters are null and the response
 * carries an honest `source` label. The token is read from process.env only
 * and is NEVER written to logs or error strings (redacted before use).
 */
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ledger as cohortLedger } from '../../../packages/contract/managed/cohort/contract/index.js';

export const BLOCKFROST_GRAPHQL_URL = 'https://midnight-preprod.blockfrost.io/api/v0';
export const WAVE1_CONTRACT_ADDRESS =
  '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc';

const HEX = /^[0-9a-fA-F]+$/;

/** Project token from the environment only. Empty string when not configured. */
export function blockfrostProjectId() {
  return String(process.env.BLOCKFROST_PROJECT_ID || '').trim();
}

export function tokenConfigured() {
  return blockfrostProjectId().length > 0;
}

export function tokenMissingReason() {
  return 'indexer token not configured (set BLOCKFROST_PROJECT_ID)';
}

/**
 * Append ?project_id=<token> to a Blockfrost URL. URLs that already carry
 * project_id, non-Blockfrost URLs, and the no-token case pass through
 * unchanged. Never throws.
 */
export function withProjectId(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    if (!isBlockfrostGraphqlUrl(url)) return url;
    const u = new URL(url);
    if (u.searchParams.has('project_id')) return url;
    const token = blockfrostProjectId();
    if (!token) return url;
    u.searchParams.set('project_id', token);
    return u.toString();
  } catch {
    return url;
  }
}

export function isBlockfrostGraphqlUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'midnight-preprod.blockfrost.io';
  } catch {
    return false;
  }
}

function validAddress(v) {
  return typeof v === 'string' && HEX.test(v) ? v : '';
}

/** Wave-1 deployed contract address (env override or the deployed default). */
export function wave1ContractAddress() {
  return validAddress((process.env.COHORT_CONTRACT_ADDRESS || '').trim()) || WAVE1_CONTRACT_ADDRESS;
}

/** Wave-3 contract address. Empty string = not deployed yet. */
export function wave3ContractAddress() {
  return validAddress((process.env.CONTRACT_ADDRESS_WAVE3 || '').trim());
}

export function indexerUrl() {
  return withProjectId(process.env.MIDNIGHT_INDEXER_URL || BLOCKFROST_GRAPHQL_URL);
}

/** Scrub the token out of any string before it touches logs or responses. */
function redactToken(text) {
  const token = blockfrostProjectId();
  if (!token || !text) return text;
  return String(text).split(token).join('[redacted]');
}

/**
 * Fetch the raw hex-encoded contract state (plus the deploying block height)
 * for one contract address. fetchImpl is injectable for tests.
 */
export async function queryContractStateHex({ indexerUrl: url, contractAddress, fetchImpl = fetch }) {
  if (!contractAddress || !HEX.test(contractAddress)) {
    const err = new Error('contract address not configured');
    err.status = 503;
    throw err;
  }
  const query = `query PublicLedger($address: HexEncoded!) {
    contractAction(address: $address) {
      state
      transaction { block { height } }
    }
  }`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { address: contractAddress } }),
    });
  } catch (err) {
    const e = new Error(`indexer unreachable: ${redactToken(err?.message || err)}`);
    e.status = 502;
    throw e;
  }
  if (!res.ok) {
    const err = new Error(`indexer HTTP ${res.status}`);
    err.status = 502;
    throw err;
  }
  const json = await res.json();
  if (Array.isArray(json.errors) && json.errors.length) {
    const err = new Error(json.errors[0]?.message || 'indexer GraphQL error');
    err.status = 502;
    throw err;
  }
  const action = json.data?.contractAction;
  const hex = action?.state;
  if (!hex || !HEX.test(hex)) {
    const err = new Error('indexer returned no contract state');
    err.status = 502;
    throw err;
  }
  const blockHeight = Number(action?.transaction?.block?.height);
  return { hex, blockHeight: Number.isInteger(blockHeight) ? blockHeight : null };
}

/**
 * Decode Wave-1 public ledger fields (spent, referrals, proven) from the
 * generated ledger() state data (StateValue). Pure decode — no bytes needed,
 * so it is directly unit-testable against compact-runtime simulator state.
 */
export function countersFromStateData(stateData) {
  const pub = cohortLedger(stateData);
  return {
    proven: Number(pub.proven.toString()),
    spentSize: Number(pub.spent.size().toString()),
    referralsSize: Number(pub.referrals.size().toString()),
  };
}

/** Decode Wave-1 public ledger fields (spent, referrals, proven) from state hex. */
export function decodeWave1Counters(hex) {
  const state = ContractState.deserialize(Buffer.from(hex, 'hex'));
  return countersFromStateData(state.data);
}

/**
 * Decode the Wave-3 attestation fields (attestations Set<Bytes<32>>,
 * attestationsVerified Counter) from ledger state data, via the generated
 * ledger() accessors (mirrors the Wave-1 pattern in packages/dapp/src/
 * public-state.mjs). Pure decode — unit-testable against compact-runtime
 * simulator state. Throws when the contract state has no such fields
 * (i.e. a Wave-1 state, or Wave-3 not deployed at the address).
 */
export function attestationFieldsFromStateData(stateData) {
  const pub = cohortLedger(stateData);
  return {
    attestationsSize: Number(pub.attestations.size().toString()),
    attestationsVerified: Number(pub.attestationsVerified.toString()),
  };
}

/**
 * Decode the Wave-3 attestation fields from state hex. Throws when the
 * contract state has no such fields (i.e. Wave-3 not deployed at the address).
 */
export function decodeWave3AttestationFields(hex) {
  return attestationFieldsFromStateData(ContractState.deserialize(Buffer.from(hex, 'hex')).data);
}

const WAVE3_NULL = Object.freeze({
  attestationsSize: null,
  attestationsVerified: null,
  attestationSource: 'not-deployed',
  attestationReason: 'Wave-3 contract not deployed yet (CONTRACT_ADDRESS_WAVE3 unset)',
});

const COUNTERS_NULL = Object.freeze({
  proven: null,
  spentSize: null,
  referralsSize: null,
  attestationsSize: null,
  attestationsVerified: null,
  attestationSource: 'not-deployed',
  attestationReason: 'Wave-3 contract not deployed yet (CONTRACT_ADDRESS_WAVE3 unset)',
  blockHeight: null,
});

/**
 * Read all live ledger counters. Never invents numbers:
 * - no BLOCKFROST_PROJECT_ID  -> source 'no-token-configured', counters null
 * - query/decode failure       -> source 'live-onchain-query-failed', counters null
 * - Wave-3 undeployed          -> attestation counters null, labeled 'not-deployed'
 */
export async function readLiveLedger({ fetchImpl = fetch } = {}) {
  const contractAddress = wave1ContractAddress();
  const wave3Address = wave3ContractAddress();
  const fetchedAt = new Date().toISOString();

  if (!tokenConfigured()) {
    return {
      ...COUNTERS_NULL,
      contractAddress,
      wave3ContractAddress: wave3Address,
      source: 'no-token-configured',
      reason: tokenMissingReason(),
      fetchedAt,
    };
  }

  const url = indexerUrl();
  try {
    const { hex, blockHeight } = await queryContractStateHex({
      indexerUrl: url,
      contractAddress,
      fetchImpl,
    });
    const wave1 = decodeWave1Counters(hex);

    // Wave-3 attestation fields live on the Wave-3 contract only. The Wave-1
    // state has no indices 3/4, so decoding there throws -> not-deployed.
    let attestation = { ...WAVE3_NULL };
    if (wave3Address) {
      try {
        const { hex: wave3Hex } = await queryContractStateHex({
          indexerUrl: url,
          contractAddress: wave3Address,
          fetchImpl,
        });
        const decoded = decodeWave3AttestationFields(wave3Hex);
        attestation = {
          attestationsSize: decoded.attestationsSize,
          attestationsVerified: decoded.attestationsVerified,
          attestationSource: 'live-onchain',
          attestationReason: null,
        };
      } catch {
        attestation = {
          ...WAVE3_NULL,
          attestationReason: 'Wave-3 contract state has no attestation fields yet',
        };
      }
    }

    return {
      ...wave1,
      ...attestation,
      contractAddress,
      wave3ContractAddress: wave3Address,
      source: 'live-onchain',
      reason: null,
      blockHeight,
      fetchedAt,
    };
  } catch (err) {
    return {
      ...COUNTERS_NULL,
      contractAddress,
      wave3ContractAddress: wave3Address,
      source: 'live-onchain-query-failed',
      reason: redactToken(err?.message || 'indexer query failed'),
      fetchedAt,
    };
  }
}

/**
 * Attestation counters for GET /api/attestation-counters. Null + labeled
 * while the Wave-3 contract is undeployed.
 */
export async function readAttestationCounters({ fetchImpl = fetch } = {}) {
  const wave3Address = wave3ContractAddress();
  const fetchedAt = new Date().toISOString();
  const base = {
    contractAddress: wave3Address || null,
    wave3Deployed: Boolean(wave3Address),
    attestationsSize: null,
    attestationsVerified: null,
    fetchedAt,
  };
  if (!wave3Address) {
    return {
      ...base,
      source: 'not-deployed',
      reason: 'Wave-3 contract not deployed yet (CONTRACT_ADDRESS_WAVE3 unset)',
    };
  }
  if (!tokenConfigured()) {
    return { ...base, source: 'no-token-configured', reason: tokenMissingReason() };
  }
  try {
    const { hex } = await queryContractStateHex({
      indexerUrl: indexerUrl(),
      contractAddress: wave3Address,
      fetchImpl,
    });
    const decoded = decodeWave3AttestationFields(hex);
    return {
      ...base,
      attestationsSize: decoded.attestationsSize,
      attestationsVerified: decoded.attestationsVerified,
      source: 'live-onchain',
      reason: null,
    };
  } catch (err) {
    return {
      ...base,
      source: 'live-onchain-query-failed',
      reason: redactToken(err?.message || 'indexer query failed'),
    };
  }
}
