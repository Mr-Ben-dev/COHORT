/**
 * COHORT — demo-runner: ONE circuit-running code path for both demo tiers.
 *
 * Tier 1 ("Try in browser (no install)") and Tier 2 ("Prove with wallet")
 * both run the SAME compiled circuits from
 * packages/contract/managed/cohort/contract/index.js via this module —
 * Tier 1 through the compact-runtime in-browser simulator, Tier 2 through
 * the wallet's real proving + submission path.
 *
 * SEAMS (owned by other squads — do not duplicate here):
 * - packages/dapp/src/attest.mjs (B7, not on disk 2026-10-19): issuer-side
 *   issuance helpers. demo-runner never mints attestations; the
 *   proveAttested demo button stays gated until the issuer ceremony runs.
 * - packages/dapp/src/truth-gate.mjs (C1 — LANDED 2026-10-19): the canonical
 *   "confirm the ledger effect before UI success" poller. waitForLedgerEffect()
 *   feature-detects it and delegates to its waitForLedgerEffect +
 *   assertClaimedSuccess (branded results); the local polling path below is
 *   the fallback only when the module is absent (e.g. in unit tests that
 *   inject truthGate: null).
 * - The managed build (rebuilt by B1 2026-10-19 ~02:24 UTC) now exposes all
 *   four circuits (proveEligible, attest, attestWithAttributes,
 *   proveAttested). availableCircuits() feature-detects per build, so the
 *   runner never assumes a circuit exists. proveAttested stays GATED in the
 *   demo regardless: the issuer key ceremony has not run (ISSUER_ID is still
 *   the zero placeholder — verified behaviorally by probeCeremony), so no
 *   attestation can exist for it to verify.
 *
 * PRIVACY: Tier 1 witnesses live in page React state and are passed to the
 * simulator in-memory only. demo-runner performs zero network I/O on the
 * Tier 1 path — no fetch, no beacon, no storage.
 */

import * as RT from '@midnight-ntwrk/compact-runtime';

// ---------------------------------------------------------------------------
// Pure tier metadata — no silent mappings; unknown tiers throw.
// ---------------------------------------------------------------------------

export const TIERS = Object.freeze({
  SIMULATOR: 'simulator',
  WALLET: 'wallet',
});

/** Every result produced on the Tier 1 path must carry this label. */
export const SIMULATION_DISCLAIMER = 'simulated proof — not on-chain';

const TIER_META = {
  [TIERS.SIMULATOR]: {
    title: 'Try in browser (no install)',
    blurb:
      'Runs the real compiled proveEligible circuit in this page via the ' +
      'Compact runtime simulator. Your answers never leave the browser.',
    honesty: SIMULATION_DISCLAIMER,
  },
  [TIERS.WALLET]: {
    title: 'Prove with wallet',
    blurb:
      'Connect GeroWallet (1AM fallback), build a real zero-knowledge proof, ' +
      'and submit it to Preprod. Success shows only after the ledger ' +
      'effect is confirmed on-chain.',
    honesty: 'on-chain proof — confirmed via ledger read',
  },
};

export class DemoRunnerError extends Error {
  constructor(code, message, cause) {
    // The code is embedded in the message so assert.rejects(/CODE/) and any
    // log line identify the failure class without inspecting `.code`.
    super(`[${code}] ${message}`);
    this.name = 'DemoRunnerError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export function tierMeta(tier) {
  const meta = TIER_META[tier];
  if (!meta) {
    throw new DemoRunnerError(
      'UNKNOWN_TIER',
      `Unknown demo tier '${String(tier)}'. Known tiers: ${Object.values(TIERS).join(', ')}.`,
    );
  }
  return meta;
}

export function tierTitle(tier) {
  return tierMeta(tier).title;
}

// ---------------------------------------------------------------------------
// Circuit names
// ---------------------------------------------------------------------------

export const CIRCUITS = Object.freeze({
  PROVE_ELIGIBLE: 'proveEligible',
  PROVE_ATTESTED: 'proveAttested',
});

// ---------------------------------------------------------------------------
// Witness helpers (mirror TESTS/circuit-lib.mjs exactly — same code path)
// ---------------------------------------------------------------------------

export function randomBytes32() {
  const out = new Uint8Array(32);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function bytes32FromNumber(n) {
  const out = new Uint8Array(32);
  out[31] = n & 0xff;
  return out;
}

export function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Private witness bundle. age is BigInt (circuit Uint<8>); booleans stay
 * booleans. secret/blind (and the attestation witnesses) default to fresh
 * randomness — reusing a secret for the same trial is rejected by the
 * circuit's nullifier set, so demos must mint fresh ones per run.
 */
export function makeWitnesses({
  age,
  condition,
  medication,
  secret = randomBytes32(),
  blind = randomBytes32(),
  holderSecret = null,
  nonce = null,
} = {}) {
  const ageBig = typeof age === 'bigint' ? age : BigInt(Math.trunc(Number(age)));
  if (ageBig < 0n || ageBig > 255n) {
    throw new DemoRunnerError('BAD_WITNESS', `age ${String(age)} out of Uint<8> range 0..255.`);
  }
  const witnesses = {
    age: ageBig,
    condition: Boolean(condition),
    medication: Boolean(medication),
    secret,
    blind,
  };
  if (holderSecret) witnesses.holderSecret = holderSecret;
  if (nonce) witnesses.nonce = nonce;
  return witnesses;
}

export const witnessAdapters = {
  wAge: (ctx) => [ctx.privateState, ctx.privateState.age],
  wCondition: (ctx) => [ctx.privateState, ctx.privateState.condition],
  wMedication: (ctx) => [ctx.privateState, ctx.privateState.medication],
  wSecret: (ctx) => [ctx.privateState, ctx.privateState.secret],
  wBlind: (ctx) => [ctx.privateState, ctx.privateState.blind],
  wHolderSecret: (ctx) => [ctx.privateState, ctx.privateState.holderSecret],
  wNonce: (ctx) => [ctx.privateState, ctx.privateState.nonce],
  wIssuerSecret: (ctx) => [ctx.privateState, ctx.privateState.issuerSecret],
};

// ---------------------------------------------------------------------------
// Compiled-contract loading
// ---------------------------------------------------------------------------

/**
 * Relative specifier from this module to the canonical managed build.
 * Resolves under both Node (tests) and the Next.js bundler (demo page).
 * A single literal candidate: webpack must resolve every dynamic-import
 * specifier at build time, so candidates for builds that may not exist on
 * disk (B1's mid-rebuild .compile-out TS) cannot be listed statically.
 */
const MANAGED_CONTRACT_SPEC = '../../../packages/contract/managed/cohort/contract/index.js';

function defaultImport(spec) {
  return import(/* webpackChunkName: "cohort-compiled-contract" */ spec);
}

export async function loadContractModule({ importFn = defaultImport } = {}) {
  let mod;
  try {
    mod = await importFn(MANAGED_CONTRACT_SPEC);
  } catch (err) {
    throw new DemoRunnerError(
      'CONTRACT_LOAD_FAILED',
      `Could not load the compiled contract (${MANAGED_CONTRACT_SPEC}). ` +
        'The B1 rebuild may be mid-flight; retry after it lands.',
      err,
    );
  }
  if (typeof mod?.Contract !== 'function' || typeof mod?.ledger !== 'function') {
    throw new DemoRunnerError(
      'CONTRACT_SHAPE',
      'Compiled contract module does not export Contract + ledger. Refusing to run.',
    );
  }
  return { Contract: mod.Contract, ledger: mod.ledger, source: MANAGED_CONTRACT_SPEC };
}

/** Circuit names this build actually exposes — feature-detected, never assumed. */
export function availableCircuits(contractInstance) {
  const impure = contractInstance?.impureCircuits ?? {};
  return Object.keys(impure);
}

export function assertCircuit(contractInstance, circuitName) {
  const available = availableCircuits(contractInstance);
  if (!available.includes(circuitName)) {
    throw new DemoRunnerError(
      'CIRCUIT_NOT_AVAILABLE',
      `Circuit '${circuitName}' is not in this contract build. ` +
        `Available: ${available.length ? available.join(', ') : '(none)'}. ` +
        'This is a build gap, not a proof failure — nothing was proven.',
    );
  }
}

// ---------------------------------------------------------------------------
// Simulator boot + circuit run (the shared code path)
// ---------------------------------------------------------------------------

export function bootSimulator({ Contract }, privateState) {
  const contract = new Contract(witnessAdapters);
  const ctor = contract.initialState(RT.createConstructorContext(privateState, '0'.repeat(64)));
  return { contract, ctor, addr: RT.sampleContractAddress() };
}

export function ledgerSummary(ledgerFn, state) {
  const pub = ledgerFn(state);
  return {
    proven: pub.proven.toString(),
    spent: pub.spent.size().toString(),
    referrals: pub.referrals.size().toString(),
    attestationsVerified: pub.attestationsVerified ? pub.attestationsVerified.toString() : '0',
  };
}

/**
 * Run a circuit through the in-browser simulator. Same call for Tier 1
 * direct use and for anything else that needs the simulator path.
 *
 * Returns { ok: true, result, ledger } — result is the circuit's return
 * value (Boolean for both eligibility circuits).
 *
 * Throws DemoRunnerError with the circuit's own assertion message when the
 * proof fails (e.g. 'too young'). A failed proof is an EXPLICIT failure,
 * never a silent one: the caller must surface err.message to the user
 * alongside a failed state.
 */
export function runCircuit({
  contractModule,
  circuit,
  privateState,
  args = [],
  priorState = null,
}) {
  const { Contract, ledger } = contractModule;
  const session = bootSimulator({ Contract }, privateState);
  assertCircuit(session.contract, circuit);
  const state = priorState ?? session.ctor.currentContractState;
  const ctx = RT.createCircuitContext(session.addr, '0'.repeat(64), state, privateState);
  let out;
  try {
    out = session.contract.impureCircuits[circuit](ctx, ...args);
  } catch (err) {
    throw new DemoRunnerError(
      'CIRCUIT_ASSERT_FAILED',
      `Circuit '${circuit}' rejected the proof: ${err?.message ?? String(err)}`,
      err,
    );
  }
  return {
    ok: true,
    result: out.result,
    ledger: ledgerSummary(ledger, out.context.currentQueryContext.state),
    context: out.context,
  };
}

/** Convenience: trial-scoped proveEligible run for the Tier 1 demo form. */
export function runProveEligibleSimulator(contractModule, {
  witnesses,
  trialByte = 1,
  minAge = 18n,
  maxAge = 80n,
  requireCondition = true,
  forbidMedication = true,
  priorState = null,
} = {}) {
  return runCircuit({
    contractModule,
    circuit: CIRCUITS.PROVE_ELIGIBLE,
    privateState: witnesses,
    args: [bytes32FromNumber(trialByte), BigInt(minAge), BigInt(maxAge), Boolean(requireCondition), Boolean(forbidMedication)],
    priorState,
  });
}

// ---------------------------------------------------------------------------
// Issuer-ceremony gate for proveAttested
// ---------------------------------------------------------------------------

const CEREMONY_PENDING_REASON =
  'The demo-issuer key ceremony (scripts/issuer-ceremony.mjs) has not run yet: ' +
  'no ISSUER_ID is baked into the contract and no judge attestation ' +
  'credentials exist (TESTS/judge-credentials/ is empty). Without a published ' +
  "attestation the circuit rejects with 'no issuer attestation for these " +
  "attributes'. This button unlocks once B2's ceremony lands.";

export function gateProveAttested({ ceremonyComplete = false } = {}) {
  if (ceremonyComplete === true) return { allowed: true, reason: null };
  return { allowed: false, reason: CEREMONY_PENDING_REASON };
}

/**
 * Runtime probe of the demo-issuer ceremony state. Never throws — returns
 * { ceremonyComplete, issuerIdHex, reason }.
 *
 * Method (behavioral, no source inspection): run attestWithAttributes in a
 * THROWAWAY simulator with an all-zero issuer secret. The circuit gates on
 * disclose(wIssuerSecret()) == issuerId(). The ceremony replaces the zero
 * placeholder with disclose(demoIssuerSecret) — 32 random bytes, nonzero
 * with overwhelming probability — so:
 *   - zero secret ACCEPTED  => issuerId is still the zero placeholder => ceremony NOT run
 *   - "not the issuer"      => issuerId is nonzero                     => ceremony HAS run
 * Any other outcome is reported as inconclusive, never as complete.
 */
export function probeCeremony(contractModule) {
  const { Contract } = contractModule;
  let contract;
  try {
    contract = new Contract(witnessAdapters);
  } catch (err) {
    return { ceremonyComplete: false, issuerIdHex: null, reason: `Could not instantiate contract: ${err?.message}` };
  }
  if (typeof contract.impureCircuits?.attestWithAttributes !== 'function') {
    return {
      ceremonyComplete: false,
      issuerIdHex: null,
      reason: 'attestWithAttributes not exposed by this contract build (B1 rebuild pending).',
    };
  }
  const zero = new Uint8Array(32);
  const ps = {
    age: 42n,
    condition: true,
    medication: false,
    secret: zero,
    blind: zero,
    holderSecret: zero,
    nonce: zero,
    issuerSecret: zero,
  };
  try {
    const ctor = contract.initialState(RT.createConstructorContext(ps, '0'.repeat(64)));
    const ctx = RT.createCircuitContext(RT.sampleContractAddress(), '0'.repeat(64), ctor.currentContractState, ps);
    contract.impureCircuits.attestWithAttributes(ctx, 42n, true, false, zero, zero);
    return {
      ceremonyComplete: false,
      issuerIdHex: '00'.repeat(32),
      reason: 'ISSUER_ID is the zero placeholder — the demo-issuer key ceremony has not run.',
    };
  } catch (err) {
    if (/not the issuer/.test(err?.message ?? '')) {
      return { ceremonyComplete: true, issuerIdHex: null, reason: null };
    }
    return { ceremonyComplete: false, issuerIdHex: null, reason: `ceremony probe inconclusive: ${err?.message}` };
  }
}

// ---------------------------------------------------------------------------
// Truth gate — confirm the ledger effect before UI success (Tier 2)
// ---------------------------------------------------------------------------

const TRUTH_GATE_SPEC = '../../../packages/dapp/src/truth-gate.mjs';
const TX_STATUS_SPEC = '../../../packages/dapp/src/tx-status.mjs';
const PUBLIC_STATE_SPEC = '../../../packages/dapp/src/public-state.mjs';

/**
 * Load C1's truth-gate module if it has landed. Returns the module or null.
 * Never throws: absence is a normal, documented state.
 */
export async function loadTruthGate({ importFn = defaultImport } = {}) {
  try {
    const mod = await importFn(TRUTH_GATE_SPEC);
    return mod ?? null;
  } catch {
    return null;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Race a promise against a timeout — a hanging indexer must not freeze the gate. */
export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new DemoRunnerError('POLL_ATTEMPT_TIMEOUT', `Timed out waiting for ${label}.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Generic bounded poll. check(attempt) resolves truthy on success.
 * Throws DemoRunnerError TIMEOUT with the label — never resolves "success"
 * on timeout.
 */
export async function pollUntil({ check, timeoutMs = 120000, intervalMs = 5000, label = 'condition' }) {
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    let ok = false;
    try {
      ok = Boolean(await check(attempt));
    } catch {
      ok = false; // transient read errors retry; the timeout stays honest
    }
    if (ok) return { attempts: attempt, elapsedMs: Date.now() - started };
    if (Date.now() - started >= timeoutMs) {
      throw new DemoRunnerError(
        'TRUTH_GATE_TIMEOUT',
        `Timed out after ${timeoutMs}ms (${attempt} attempts) waiting for ${label}. ` +
          'The transaction may still confirm later — check the explorer with the tx hash.',
      );
    }
    await delay(intervalMs);
  }
}

function defaultDeps() {
  return {
    async getTransactionStatus(args) {
      const mod = await defaultImport(TX_STATUS_SPEC);
      return mod.getTransactionStatus(args);
    },
    async readPublicVerification(args) {
      const mod = await defaultImport(PUBLIC_STATE_SPEC);
      return mod.readPublicVerification(args);
    },
  };
}

/**
 * Wait until the on-chain ledger effect of a submitted proof is confirmed.
 *
 * 1. If packages/dapp/src/truth-gate.mjs is present (C1 landed 2026-10-19),
 *    delegate to its waitForLedgerEffect + assertClaimedSuccess: the
 *    predicate closes over the pre-submit `proven` baseline and requires a
 *    strict rise, so stale indexer state can never false-confirm. The result
 *    is C1-branded; assertClaimedSuccess throws on anything else.
 * 2. Fallback (module absent — e.g. unit tests injecting truthGate: null):
 *    poll locally with the same semantics: tx visible to the indexer, then
 *    the proven counter strictly above baseline.
 *
 * deps: { getTransactionStatus, readPublicVerification, ledgerFn } — injectable for tests.
 */
export async function waitForLedgerEffect({
  txId,
  contractAddress,
  baselineProven = null, // null => read the pre-submit baseline inside the gate
  deps = null,
  importFn = defaultImport,
  timeoutMs = 180000,
  intervalMs = 5000,
  truthGate = undefined, // inject the loaded module (or null) in tests
} = {}) {
  if (!txId) {
    throw new DemoRunnerError('TRUTH_GATE_NO_TX', 'No transaction id to confirm — nothing was submitted.');
  }
  const tg = truthGate === undefined ? await loadTruthGate({ importFn }) : truthGate;
  if (tg && typeof tg.waitForLedgerEffect === 'function' && typeof tg.assertClaimedSuccess === 'function') {
    const ledgerFn = deps?.ledgerFn ?? (await loadContractModule({ importFn })).ledger;
    const readBaseline = async () => {
      const snap = await tg.fetchContractState({ contractAddress });
      if (!snap || !snap.stateHex) {
        throw new DemoRunnerError(
          'TRUTH_GATE_NO_STATE',
          'Indexer has no contract action for this address yet — cannot read a pre-submit baseline.',
        );
      }
      return Number(ledgerFn(snap.stateHex).proven.toString());
    };
    const baseline = baselineProven == null ? await readBaseline() : Number(baselineProven);
    const result = await tg.waitForLedgerEffect({
      contractAddress,
      txHash: txId,
      timeoutMs,
      pollIntervalMs: intervalMs,
      expectedPredicate: ({ stateHex }) => {
        if (!stateHex) return false;
        return Number(ledgerFn(stateHex).proven.toString()) > baseline;
      },
    });
    tg.assertClaimedSuccess(result); // throws unless the ledger effect was observed
    return {
      source: 'truth-gate.mjs',
      txId,
      txHash: txId,
      contractAddress,
      baselineProven: baseline,
      confirmed: true,
      observedAtBlock: result.observedAtBlock ?? null,
      attempts: result.attempts ?? 0,
      note: 'C1 truth gate: branded, ledger-observed confirmation.',
    };
  }
  const { getTransactionStatus, readPublicVerification } = deps ?? defaultDeps();
  const baseline =
    baselineProven == null ? Number((await readPublicVerification({ contractAddress })).proven) : Number(baselineProven);

  // Step 1: the transaction itself must be visible to the indexer.
  // Each attempt is itself bounded: a hanging watchForTxData must not
  // freeze the gate past the overall timeout.
  const tx = await pollUntil({
    label: `indexer confirmation of tx ${txId}`,
    timeoutMs,
    intervalMs,
    check: async () => {
      const st = await withTimeout(getTransactionStatus({ txId }), intervalMs, 'indexer tx watch');
      return st && (st.status === 'confirmed' || st.status === 'success' || st.blockHeight != null);
    },
  });

  // Step 2: the ledger effect — proven counter strictly above baseline.
  const ledger = await pollUntil({
    label: `proven counter above baseline (${baseline}) on ${contractAddress}`,
    timeoutMs,
    intervalMs,
    check: async () => {
      const v = await readPublicVerification({ contractAddress });
      return Number(v.proven) > Number(baseline);
    },
  });

  const final = await readPublicVerification({ contractAddress });
  return {
    source: 'demo-runner-local-truth-gate',
    note: 'truth-gate.mjs not on disk — local polling with identical semantics; C1 wiring pending.',
    txAttempts: tx.attempts,
    ledgerAttempts: ledger.attempts,
    baselineProven: baseline,
    proven: Number(final.proven),
    txId,
    contractAddress,
  };
}

// ---------------------------------------------------------------------------
// Tier 2 wallet entry points (import — never re-implement — wallet detection)
// ---------------------------------------------------------------------------

const WALLETS_SPEC = '../../../packages/dapp/src/wallets.mjs';
const PROVE_SPEC = '../../../packages/dapp/src/prove.mjs';

/** GeroWallet primary, 1AM fallback. Returns { id, api, ... } from wallets.mjs. */
export async function connectDemoWallet({ preferred = 'gero', networkId = 'preprod', importFn = defaultImport } = {}) {
  const mod = await importFn(WALLETS_SPEC);
  const order = preferred === 'gero' ? ['gero', '1am'] : [preferred];
  let lastErr = null;
  for (const id of order) {
    try {
      const wallet = await mod.connectWallet(id, { networkId });
      return { ...wallet, connectedVia: id };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new DemoRunnerError(
    'WALLET_CONNECT_FAILED',
    `Could not connect GeroWallet or 1AM: ${lastErr?.message ?? String(lastErr)}`,
    lastErr,
  );
}

export function geroTrustNote(walletsModule) {
  return walletsModule?.GERO_CLOUD_PROVING_NOTE ?? null;
}

/**
 * Submit a real proveEligible proof through the connected wallet.
 * Returns the raw prove.mjs result ({ txId, txHash, blockHeight, ... }).
 * Private facts are passed straight through to prove.mjs — they never
 * touch demo-runner storage, and prove.mjs fail-closes on envelope leaks.
 */
export async function submitWalletProof({ facts, trialId, wallet, networkId = 'preprod', origin, importFn = defaultImport, onStage } = {}) {
  const mod = await importFn(PROVE_SPEC);
  return mod.proveEligibility({ facts, trialId, wallet, networkId, origin, onStage });
}
