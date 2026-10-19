/**
 * Dapp wiring for the issuer-attested circuits (B1 contract, SQUAD B7).
 *
 * COHORT: "Prove you qualify for a clinical trial without handing over
 * your medical record."
 *
 * Wired circuits (all from CONTRACT/cohort.compact as implemented by B1):
 *   - attestationOf(age, cond, med, holderSecret, nonce) -> Bytes<32>   (pure)
 *   - issuerIdOf(secret) -> Bytes<32>                                   (pure)
 *   - attest(attestation) -> Boolean           (issuer-gated, tx)
 *   - attestWithAttributes(age, cond, med, holderSecret, nonce) -> Bool (issuer-gated, tx)
 *   - proveAttested(trialId, minAge, maxAge, requireCondition, forbidMedication) -> Boolean (tx)
 *
 * GENERATED-CONTRACT CHOICE (B7 decision): the compiled contract TS is
 * resolved lazily from the first copy that exists AND exports the B1
 * attestation circuits, in this order:
 *   1. packages/contract/.compile-out/contract/index.js
 *   2. packages/contract/managed/cohort/contract/index.js
 * The managed copy is currently STALE (pre-attestation: no
 * attestationOf/issuerIdOf/attest/attestWithAttributes/proveAttested) and is
 * rejected by the circuit-presence check — which is why
 * packages/dapp/src/public-state.mjs and contract.mjs cannot be reused for
 * the new circuits. Laziness also survives B1 recompiles deleting the
 * output mid-run: functions fail with a clear NOT_IMPLEMENTED instead of an
 * import-time crash.
 *
 * ISSUER SECRET: the issuer secret is INJECTED as a parameter
 * (attestViaIssuer / privateState), never hardcoded. issuerId() currently
 * returns 32 zero bytes (demo-issuer placeholder until the B2 key ceremony);
 * the module does not bake that value in — the issuer client supplies it.
 *
 * ZK artifacts for the new circuits live under packages/contract/.compile-out
 * (keys/, zkir/); packages/contract/zk still holds proveEligible only.
 *
 * No mock fallbacks anywhere: every network-touching function surfaces real
 * errors as CohortError with the original cause.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { CohortError, ErrorCode } from './errors.mjs';
import { configureNetwork, createPublicDataProvider } from './public-state.mjs';
import { encodeTrialId } from './encoding.mjs';
import { env } from './env.mjs';
import { blockfrostIndexerUrl, blockfrostIndexerWsUrl } from './blockfrost.mjs';

export const ATTEST_PRIVATE_STATE_ID = 'cohortAttestPrivateState';
/** Safety cap when enumerating the on-chain attestations set. */
export const ATTEST_MAX_READ_MEMBERS = 1000;

/** Circuit ids as compiled from CONTRACT/cohort.compact. */
export const ATTEST_CIRCUITS = Object.freeze({
  attest: 'attest',
  attestWithAttributes: 'attestWithAttributes',
  proveAttested: 'proveAttested',
});

/** Candidate generated-contract copies, in preference order. */
const GENERATED_CONTRACT_CANDIDATES = Object.freeze([
  '../../contract/.compile-out/contract/index.js',
  '../../contract/managed/cohort/contract/index.js',
]);

let generatedCache = null;

/**
 * Lazy generated-contract loader. Picks the first candidate that exists and
 * exports the B1 attestation circuits. Cached after the first successful load.
 */
export async function loadGeneratedContract() {
  if (generatedCache) return generatedCache;
  const base = new URL(import.meta.url);
  const attempts = [];
  for (const rel of GENERATED_CONTRACT_CANDIDATES) {
    try {
      const mod = await import(new URL(rel, base).href);
      if (
        mod &&
        typeof mod.Contract === 'function' &&
        typeof mod.ledger === 'function' &&
        mod.pureCircuits &&
        typeof mod.pureCircuits.attestationOf === 'function' &&
        typeof mod.pureCircuits.issuerIdOf === 'function'
      ) {
        generatedCache = { sourcePath: rel, Contract: mod.Contract, ledger: mod.ledger, pureCircuits: mod.pureCircuits };
        return generatedCache;
      }
      attempts.push(`${rel}: present but missing the B1 attestation circuits (stale generated copy)`);
    } catch (err) {
      attempts.push(`${rel}: ${err && err.message ? err.message : err}`);
    }
  }
  throw new CohortError(
    ErrorCode.NOT_IMPLEMENTED,
    `Generated contract with the B1 attestation circuits is unavailable. ${attempts.join(' | ')}`,
  );
}

function assertBytes32(value, name) {
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, `${name} must be a 32-byte Uint8Array.`);
  }
  return value;
}

function assertAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, 'attrs {age, condition, medication} is required.');
  }
  const { age, condition, medication } = attrs;
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 0 || age > 255) {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'attrs.age must be an integer 0..255 (Uint<8>).');
  }
  if (typeof condition !== 'boolean' || typeof medication !== 'boolean') {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, 'attrs.condition and attrs.medication must be booleans.');
  }
  return { age, condition, medication };
}

function assertTrialPredicate(predicate) {
  if (!predicate || typeof predicate !== 'object') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'trialPredicate is required.');
  }
  const { trialId, minAge, maxAge, requireCondition, forbidMedication } = predicate;
  if (typeof trialId !== 'string' || trialId.length === 0) {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'trialPredicate.trialId must be a non-empty string.');
  }
  if (typeof minAge !== 'number' || typeof maxAge !== 'number') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'trialPredicate needs typed numeric minAge/maxAge.');
  }
  if (typeof requireCondition !== 'boolean' || typeof forbidMedication !== 'boolean') {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'trialPredicate needs boolean requireCondition/forbidMedication.');
  }
  return { trialId, minAge, maxAge, requireCondition, forbidMedication };
}

/**
 * midnight-js call providers (createCallProviders) are required for circuit
 * txs. Anything else is rejected loudly — no mock provider is accepted.
 */
function assertCallProviders(provider, fn) {
  if (
    !provider ||
    typeof provider !== 'object' ||
    typeof provider.privateStateProvider?.set !== 'function' ||
    !provider.proofProvider ||
    !provider.walletProvider ||
    !provider.contractAddress
  ) {
    throw new CohortError(
      ErrorCode.WALLET_UNAVAILABLE,
      `${fn} requires midnight-js call providers from createCallProviders() (privateStateProvider, proofProvider, walletProvider, contractAddress). No mock provider is accepted.`,
    );
  }
}

/**
 * Contract address for the issuer-attested circuits.
 * The new circuits are compiled but NOT yet deployed (B5 pinned, undeployed);
 * the old proveEligible-only address is deliberately NOT used as a fallback.
 */
export function resolveAttestContractAddress(opts = {}) {
  const addr = opts.contractAddress || env('COHORT_ATTEST_CONTRACT_ADDRESS', '');
  if (!addr) {
    throw new CohortError(
      ErrorCode.NOT_IMPLEMENTED,
      'Issuer-attested circuits are compiled but not yet deployed. Set COHORT_ATTEST_CONTRACT_ADDRESS (or pass contractAddress) once the new contract is deployed.',
    );
  }
  return addr;
}

/**
 * Pure: compute the attestation commitment off-chain exactly as the
 * attestationOf pure circuit does (persistentCommit of attrsHash + binding).
 * Resolves to { attestation: Bytes<32>, inputs } — no secret material is
 * disclosed beyond what the caller already holds.
 * Async only because the generated contract copy is resolved lazily.
 */
export async function buildAttestationInputs(attrs, holderSecret, nonce) {
  const { age, condition, medication } = assertAttributes(attrs);
  assertBytes32(holderSecret, 'holderSecret');
  assertBytes32(nonce, 'nonce');
  const { pureCircuits } = await loadGeneratedContract();
  const attestation = pureCircuits.attestationOf(BigInt(age), condition, medication, holderSecret, nonce);
  return {
    attestation,
    inputs: { age, condition, medication, holderSecret, nonce },
  };
}

/** Pure: ceremony helper — issuer id derived from the issuer secret. */
export async function issuerIdOf(secret) {
  assertBytes32(secret, 'secret');
  const { pureCircuits } = await loadGeneratedContract();
  return pureCircuits.issuerIdOf(secret);
}

function attestZkDir() {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    return path.join(root, 'packages/contract/.compile-out');
  }
  return '/zk';
}

/** Compiled contract for the new circuits, with issuer-attestation witnesses. */
export async function createAttestCompiledContract(
  witnesses = {
    wAge: ({ privateState }) => [privateState, BigInt(privateState.age)],
    wCondition: ({ privateState }) => [privateState, Boolean(privateState.condition)],
    wMedication: ({ privateState }) => [privateState, Boolean(privateState.medication)],
    wSecret: ({ privateState }) => [privateState, privateState.secret],
    wBlind: ({ privateState }) => [privateState, privateState.blind],
    wHolderSecret: ({ privateState }) => [privateState, privateState.holderSecret],
    wNonce: ({ privateState }) => [privateState, privateState.nonce],
    wIssuerSecret: ({ privateState }) => [privateState, privateState.issuerSecret],
  },
) {
  const { Contract } = await loadGeneratedContract();
  const assets = attestZkDir();
  return CompiledContract.make('cohort', Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(assets),
  );
}

function extractTxId(result, circuitId) {
  const txId = result.public?.txId;
  const txHash = result.public?.txHash;
  if (!txId && !txHash) {
    throw new CohortError(ErrorCode.TX_UNCONFIRMED, `${circuitId}: submitCallTx returned no transaction identifier.`);
  }
  return { txId, txHash, blockHeight: result.public?.blockHeight };
}

function rethrowAsProvingFailed(err, circuitId) {
  if (err instanceof CohortError) throw err;
  throw new CohortError(ErrorCode.PROVING_FAILED, `${circuitId}: proving or submission failed.`, { cause: err });
}

/**
 * Issuer side: publish a pre-computed attestation commitment into the public
 * attestations set. The issuer secret is INJECTED (parameter), never
 * hardcoded — the demo issuer knows it off-chain and supplies it here.
 *
 * provider: midnight-js call providers from createCallProviders().
 * issuerSecret: Bytes<32> (injected demo-issuer secret).
 * attestation: Bytes<32> from buildAttestationInputs().
 */
export async function attestViaIssuer(provider, issuerSecret, attestation) {
  assertCallProviders(provider, 'attestViaIssuer');
  assertBytes32(issuerSecret, 'issuerSecret');
  assertBytes32(attestation, 'attestation');
  const contractAddress = provider.contractAddress || resolveAttestContractAddress();
  const privateState = { issuerSecret };
  try {
    await provider.privateStateProvider.set(ATTEST_PRIVATE_STATE_ID, privateState);
    const compiledContract = await createAttestCompiledContract();
    const result = await submitCallTx(provider, {
      compiledContract,
      circuitId: ATTEST_CIRCUITS.attest,
      contractAddress,
      privateStateId: ATTEST_PRIVATE_STATE_ID,
      args: [attestation],
    });
    const { txId, txHash, blockHeight } = extractTxId(result, ATTEST_CIRCUITS.attest);
    return {
      circuitId: ATTEST_CIRCUITS.attest,
      txId,
      txHash,
      blockHeight,
      attestation: toHex(attestation),
      contractAddress,
      source: 'submitCallTx',
    };
  } catch (err) {
    rethrowAsProvingFailed(err, ATTEST_CIRCUITS.attest);
  }
}

/**
 * Holder side: prove qualification against a trial predicate using a
 * previously issuer-attested commitment. Private attributes (age, condition,
 * medication, holderSecret, nonce) never leave the holder's device; only the
 * trial-scoped nullifier and public counters are disclosed on-chain.
 *
 * holderSecrets: { age, condition, medication, holderSecret: Bytes<32>, nonce: Bytes<32> }.
 * trialPredicate: { trialId, minAge, maxAge, requireCondition, forbidMedication }.
 * Bind args to the served /api/trials policy before calling (see bindOfficialTrial).
 */
export async function proveAttestedFlow(provider, trialPredicate, holderSecrets) {
  assertCallProviders(provider, 'proveAttestedFlow');
  const policy = assertTrialPredicate(trialPredicate);
  const { age, condition, medication } = assertAttributes(holderSecrets);
  const holderSecret = assertBytes32(holderSecrets?.holderSecret, 'holderSecrets.holderSecret');
  const nonce = assertBytes32(holderSecrets?.nonce, 'holderSecrets.nonce');
  const contractAddress = provider.contractAddress || resolveAttestContractAddress();
  const privateState = { age, condition, medication, holderSecret, nonce };
  try {
    await provider.privateStateProvider.set(ATTEST_PRIVATE_STATE_ID, privateState);
    const compiledContract = await createAttestCompiledContract();
    const result = await submitCallTx(provider, {
      compiledContract,
      circuitId: ATTEST_CIRCUITS.proveAttested,
      contractAddress,
      privateStateId: ATTEST_PRIVATE_STATE_ID,
      args: [
        encodeTrialId(policy.trialId),
        BigInt(policy.minAge),
        BigInt(policy.maxAge),
        policy.requireCondition,
        policy.forbidMedication,
      ],
    });
    const { txId, txHash, blockHeight } = extractTxId(result, ATTEST_CIRCUITS.proveAttested);
    return {
      circuitId: ATTEST_CIRCUITS.proveAttested,
      txId,
      txHash,
      blockHeight,
      trialId: policy.trialId,
      contractAddress,
      source: 'submitCallTx',
    };
  } catch (err) {
    rethrowAsProvingFailed(err, ATTEST_CIRCUITS.proveAttested);
  }
}

/**
 * Decode a compact collection size. Set.size() and Counter reads come back
 * as a Compact Either { is_left, left, right } with the count big-endian in
 * `left` (32 bytes); a plain bigint/number is accepted too.
 */
export function setSizeToNumber(value) {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Set size exceeds safe integer range.');
    }
    return Number(value);
  }
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (value && typeof value === 'object' && 'is_left' in value && value.left instanceof Uint8Array) {
    let n = 0n;
    for (const b of value.left) n = (n << 8n) | BigInt(b);
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Set size exceeds safe integer range.');
    }
    return Number(n);
  }
  throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Could not decode attestations set size from indexer state.');
}

/**
 * Read the public attestations set + attestationsVerified counter from the
 * deployed attestation contract via Blockfrost GraphQL contractAction{state},
 * decoded with the generated ledger() (same pattern as readPublicVerification).
 *
 * provider: optional public-data provider exposing queryContractState().
 * Without it, one is built from indexerUrl/indexerWsUrl (Blockfrost).
 * Returns { networkId, contractAddress, size, verified, attestations: hex[], truncated, source }.
 * Members are enumerated up to ATTEST_MAX_READ_MEMBERS (truncated=true beyond).
 */
export async function readAttestationSet(provider, opts = {}) {
  const contractAddress =
    provider?.contractAddress || opts.contractAddress || resolveAttestContractAddress(opts);
  const indexerUrl = opts.indexerUrl || env('MIDNIGHT_INDEXER_URL', blockfrostIndexerUrl());
  const indexerWsUrl = opts.indexerWsUrl || env('MIDNIGHT_INDEXER_WS_URL', blockfrostIndexerWsUrl());
  const networkId = opts.networkId || env('MIDNIGHT_NETWORK', 'preprod');
  configureNetwork(networkId);
  const publicDataProvider =
    provider && typeof provider.queryContractState === 'function'
      ? provider
      : createPublicDataProvider({ indexerUrl, indexerWsUrl });
  let state;
  try {
    state = await publicDataProvider.queryContractState(contractAddress);
  } catch (err) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Indexer query for attestations set failed.', { cause: err });
  }
  if (!state) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Indexer returned no contract state for this address.');
  }
  const { ledger } = await loadGeneratedContract();
  let pub;
  try {
    pub = ledger(state.data);
  } catch (err) {
    throw new CohortError(ErrorCode.INDEXER_UNAVAILABLE, 'Could not decode attestation contract state.', { cause: err });
  }
  const size = setSizeToNumber(pub.attestations.size());
  const verified = setSizeToNumber(pub.attestationsVerified);
  const attestations = [];
  let truncated = false;
  for (const elem of pub.attestations) {
    if (attestations.length >= ATTEST_MAX_READ_MEMBERS) {
      truncated = true;
      break;
    }
    attestations.push(toHex(elem));
  }
  return {
    networkId,
    contractAddress,
    size,
    verified,
    attestations,
    truncated,
    source: 'midnight-indexer',
  };
}
