#!/usr/bin/env node
/**
 * measure-proving.mjs — COHORT proof-server measurement harness (SQUAD B6).
 *
 * Measures, per circuit (attest, attestWithAttributes, proveAttested, plus the
 * proveEligible baseline), two layers:
 *
 *   Layer 1 — witness/transcript generation (LOCAL, no proof server needed):
 *     runs each circuit through the @midnight-ntwrk/compact-runtime simulator
 *     (the same execution the test suite uses) and times it. Also records
 *     transcript shape (public-op count, private-output count) as a
 *     witness-size proxy, and the committed prover/verifier key + zkir sizes.
 *
 *   Layer 2 — real ZK proving (REQUIRES a proof server):
 *     builds an unproven call transaction from initial states
 *     (createUnprovenCallTxFromInitialStates — no network, no submission, no
 *     chain writes) and calls .prove() through httpClientProvingProvider,
 *     which hits the proof server /prove endpoint circuit-by-circuit.
 *
 * Requires:
 *   COHORT_PROOF_SERVER_URL   proof server base URL (default http://127.0.0.1:6300)
 *   COHORT_MEASURE_RUNS       proving runs per circuit (default 5, minimum 3)
 *   COHORT_LEDGER_PARAMETERS_HEX
 *                             serialized LedgerParameters (hex), needed only
 *                             for layer 2. Obtain from any connected provider
 *                             stack, e.g. the dapp's MidnightProvider:
 *                               (await midnightProvider.ledgerParameters()).serialize()
 *                             must match the network the parameters came from.
 *
 * Exit codes:
 *   0  full measurement complete
 *   2  infrastructure missing (no proof server reachable, or no compiled
 *      circuit bindings, or no ledger parameters) — layer 1 results are still
 *      printed; layer 2 is reported as NOT MEASURED, never fabricated
 *   1  real failure (circuit threw, proving errored, assertion mismatch)
 *
 * Prints a JSON report to stdout. Never submits a transaction.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROOF_SERVER_URL = process.env.COHORT_PROOF_SERVER_URL || 'http://127.0.0.1:6300';
const RUNS = Math.max(3, parseInt(process.env.COHORT_MEASURE_RUNS || '5', 10));
const LEDGER_PARAMS_HEX = process.env.COHORT_LEDGER_PARAMETERS_HEX || '';
const PROBE_TIMEOUT_MS = 5000;

const CIRCUITS = ['attest', 'attestWithAttributes', 'proveAttested'];
const BASELINE = 'proveEligible';

function bytes32(n) {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
}

// Demo-issuer secret is NEVER hardcoded here (task rule: no secrets anywhere).
// It comes from the B2 key ceremony output (scripts/.issuer-secret.json,
// gitignored) or the COHORT_DEMO_ISSUER_SECRET_HEX env var.
function loadDemoIssuerSecret() {
  const fromEnv = (process.env.COHORT_DEMO_ISSUER_SECRET_HEX || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(fromEnv)) return Uint8Array.from(Buffer.from(fromEnv, 'hex'));
  const p = path.join(root, 'scripts', '.issuer-secret.json');
  if (fs.existsSync(p)) {
    const hex = String(JSON.parse(fs.readFileSync(p, 'utf8')).issuerSecretHex || '').trim();
    if (/^[0-9a-fA-F]{64}$/.test(hex)) return Uint8Array.from(Buffer.from(hex, 'hex'));
  }
  return null;
}

function makeAttestee(issuerSecret, overrides = {}) {
  return {
    age: 42n,
    condition: true,
    medication: false,
    secret: bytes32(7),
    blind: bytes32(9),
    holderSecret: bytes32(21),
    nonce: bytes32(33),
    issuerSecret: issuerSecret.slice(),
    ...overrides,
  };
}

const witnesses = {
  wAge: (ctx) => [ctx.privateState, ctx.privateState.age],
  wCondition: (ctx) => [ctx.privateState, ctx.privateState.condition],
  wMedication: (ctx) => [ctx.privateState, ctx.privateState.medication],
  wSecret: (ctx) => [ctx.privateState, ctx.privateState.secret],
  wBlind: (ctx) => [ctx.privateState, ctx.privateState.blind],
  wHolderSecret: (ctx) => [ctx.privateState, ctx.privateState.holderSecret],
  wNonce: (ctx) => [ctx.privateState, ctx.privateState.nonce],
  wIssuerSecret: (ctx) => [ctx.privateState, ctx.privateState.issuerSecret],
};

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function p90(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)];
}
function stat(xs) {
  return { runs: xs.length, min_ms: +Math.min(...xs).toFixed(2), median_ms: +median(xs).toFixed(2), p90_ms: +p90(xs).toFixed(2), max_ms: +Math.max(...xs).toFixed(2) };
}

async function probe(url, pathSuffix) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(url + pathSuffix, { signal: ctrl.signal });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text.slice(0, 200) };
  } finally {
    clearTimeout(t);
  }
}

function artifactSizes(dir, circuit) {
  const out = {};
  const files = {
    prover_key: path.join(dir, 'keys', `${circuit}.prover`),
    verifier_key: path.join(dir, 'keys', `${circuit}.verifier`),
    zkir: path.join(dir, 'zkir', `${circuit}.zkir`),
    bzkir: path.join(dir, 'zkir', `${circuit}.bzkir`),
  };
  for (const [k, f] of Object.entries(files)) {
    out[k] = fs.existsSync(f) ? fs.statSync(f).size : null;
  }
  return out;
}

function main() {
  const fail = (code, reason) => {
    console.error(JSON.stringify({ ok: false, exit_code: code, reason }, null, 2));
    process.exit(code);
  };

  return (async () => {
    // ---- locate compiled circuit bindings ----
    const bindingCandidates = [
      path.join(root, 'packages/contract/.compile-out/contract/index.js'),
      path.join(root, 'packages/contract/managed/cohort/contract/index.js'),
    ];
    const bindingPath = bindingCandidates.find((p) => fs.existsSync(p));
    if (!bindingPath) {
      fail(2, 'No compiled circuit bindings found. Expected packages/contract/.compile-out/contract/index.js (full-ZK compile) or the managed fallback. Nothing was measured.');
      return;
    }
    const zkDir = [path.join(root, 'packages/contract/.compile-out'), path.join(root, 'packages/contract/zk')].find((d) =>
      fs.existsSync(path.join(d, 'keys')) && fs.existsSync(path.join(d, 'zkir')),
    );
    if (!zkDir) fail(2, 'No keys/zkir artifact directory found. Nothing was measured.');

    const RT = require('@midnight-ntwrk/compact-runtime');
    const { Contract, ledger, pureCircuits } = await import(pathToFileURL(bindingPath).href);
    const available = Object.keys(new Contract(witnesses).impureCircuits || {});
    const targets = [...CIRCUITS, BASELINE].filter((c) => available.includes(c));
    if (!targets.includes('proveAttested')) {
      console.error(
        'NOTE: bindings only expose proveEligible (Wave-1 managed build). ' +
          'The new issuer-attested circuits are not in this binding set.',
      );
    }

    const memTotalMb = Math.round(
      Number(fs.readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+)/)[1]) / 1024,
    );

    const issuerSecret = loadDemoIssuerSecret();
    if (targets.some((c) => c !== 'proveEligible') && !issuerSecret) {
      fail(
        2,
        'Issuer-gated circuits require the demo issuer secret: run the B2 key ceremony ' +
          '(scripts/issuer-ceremony.mjs -> scripts/.issuer-secret.json, gitignored) or set ' +
          'COHORT_DEMO_ISSUER_SECRET_HEX. Nothing was measured.',
      );
      return;
    }

    // ---- layer 1: local witness/transcript generation ----
    const layer1 = {};
    for (const circuit of targets) {
      const witnessTimes = [];
      let transcriptShape = null;
      const sizes = artifactSizes(zkDir, circuit);
      for (let run = 0; run < RUNS; run++) {
        const patient = makeAttestee(issuerSecret || bytes32(0));
        const contract = new Contract(witnesses);
        const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
        const addr = RT.sampleContractAddress();
        const ctx = (ps, st = ctor.currentContractState) =>
          RT.createCircuitContext(addr, '0'.repeat(64), st, ps);
        const t0 = performance.now();
        let out;
        if (circuit === 'attestWithAttributes') {
          out = contract.impureCircuits.attestWithAttributes(ctx(patient), 42n, true, false, patient.holderSecret, patient.nonce);
        } else if (circuit === 'attest') {
          const att = pureCircuits.attestationOf(42n, true, false, patient.holderSecret, patient.nonce);
          out = contract.impureCircuits.attest(ctx(patient), att);
        } else if (circuit === 'proveAttested') {
          const attested = contract.impureCircuits.attestWithAttributes(
            ctx(patient), 42n, true, false, patient.holderSecret, patient.nonce,
          );
          if (attested.result !== true) throw new Error('proveAttested setup: attestWithAttributes did not return true');
          const nextState = attested.context.currentQueryContext.state;
          out = contract.impureCircuits.proveAttested(ctx(patient, nextState), bytes32(1), 18n, 80n, true, true);
        } else {
          out = contract.impureCircuits.proveEligible(ctx(patient), bytes32(1), 30n, 50n, true, true);
        }
        const dt = performance.now() - t0;
        if (out.result !== true) throw new Error(`${circuit}: circuit returned ${out.result}, expected true`);
        if (transcriptShape === null) {
          transcriptShape = {
            public_ops: out.proofData.publicTranscript.length,
            private_outputs: out.proofData.privateTranscriptOutputs.length,
          };
        }
        if (run > 0) witnessTimes.push(dt); // first run = JIT warmup, excluded
      }
      layer1[circuit] = {
        witness_generation_ms: stat(witnessTimes),
        witness_generation_note:
          'Local circuit simulation (compact-runtime). This is transcript/witness generation only, NOT ZK proof generation.',
        transcript_shape: transcriptShape,
        artifacts_bytes: sizes,
        artifacts_from: zkDir.replace(root + '/', ''),
      };
    }

    // ---- layer 2: real proving through the proof server ----
    const server = { url: PROOF_SERVER_URL, version: null, health: null, reachable: false };
    try {
      const v = await probe(PROOF_SERVER_URL, '/version');
      const h = await probe(PROOF_SERVER_URL, '/health');
      server.reachable = v.ok || h.ok;
      server.version = v.ok ? v.body : null;
      server.health = h.ok ? h.body : null;
    } catch {
      server.reachable = false;
    }

    const layer2 = { measured: false, reason: null, per_circuit_ms: {} };
    if (!server.reachable) {
      layer2.reason =
        `No proof server at ${PROOF_SERVER_URL} (/version and /health unreachable). ` +
        'Start one (e.g. docker run midnightntwrk/proof-server:8.1.0) or set COHORT_PROOF_SERVER_URL.';
    } else if (!LEDGER_PARAMS_HEX) {
      layer2.reason =
        'Proof server reachable but COHORT_LEDGER_PARAMETERS_HEX is unset; ' +
        'an unproven call transaction needs chain LedgerParameters. Not measured.';
    }

    if (server.reachable && LEDGER_PARAMS_HEX) {
      const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
      const { httpClientProvingProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
      const { createUnprovenCallTxFromInitialStates } = await import('@midnight-ntwrk/midnight-js-contracts');
      const { LedgerParameters, CostModel, sampleCoinPublicKey } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');

      const zkConfigProvider = new NodeZkConfigProvider(zkDir);
      const provingProvider = httpClientProvingProvider(PROOF_SERVER_URL, zkConfigProvider);
      const ledgerParameters = LedgerParameters.deserialize(Buffer.from(LEDGER_PARAMS_HEX, 'hex'));
      const costModel = new CostModel(ledgerParameters);

      for (const circuit of targets) {
        const times = [];
        for (let run = 0; run < RUNS; run++) {
          const patient = makeAttestee(issuerSecret || bytes32(0));
          const contract = new Contract(witnesses);
          const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
          const contractAddress = RT.sampleContractAddress();
          const coinPublicKey = sampleCoinPublicKey();
          const args =
            circuit === 'attestWithAttributes'
              ? [42n, true, false, patient.holderSecret, patient.nonce]
              : circuit === 'attest'
                ? [pureCircuits.attestationOf(42n, true, false, patient.holderSecret, patient.nonce)]
                : circuit === 'proveAttested'
                  ? [bytes32(1), 18n, 80n, true, true]
                  : [bytes32(1), 30n, 50n, true, true];
          // proveAttested needs the attestation published first: reuse a
          // chained initial state by simulating attestWithAttributes locally.
          let initialContractState = ctor.currentContractState;
          if (circuit === 'proveAttested') {
            const sim = contract.impureCircuits.attestWithAttributes(
              RT.createCircuitContext(contractAddress, '0'.repeat(64), initialContractState, patient),
              42n, true, false, patient.holderSecret, patient.nonce,
            );
            initialContractState = sim.context.currentQueryContext.state;
          }
          const unproven = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
            compiledContract: contract,
            contractAddress,
            coinPublicKey,
            initialContractState,
            initialZswapChainState: undefined,
            ledgerParameters,
            circuitId: circuit,
            circuitArgs: args,
            privateStateId: 'measure-proving',
          }, /* walletEncryptionPublicKey */ undefined);
          const t0 = performance.now();
          const proved = await unproven.prove(provingProvider, costModel);
          times.push(run > 0 ? performance.now() - t0 : null); // first run = warmup, excluded
          if (!proved) throw new Error(`${circuit}: .prove() returned empty`);
        }
        layer2.per_circuit_ms[circuit] = stat(times.filter((t) => t !== null));
      }
      layer2.measured = true;
    }

    const report = {
      ok: true,
      measured_at: new Date().toISOString(),
      hardware: { ram_total_mb: memTotalMb, note: 'VM; shared tenancy — treat timings as indicative, not lab-grade' },
      toolchain: {
        compact: '0.31.1',
        ledger: 8,
        'proof-server-expected': '8.1.0',
        bindings: bindingPath.replace(root + '/', ''),
      },
      runs_per_circuit: RUNS,
      warmup: 'first run of each circuit excluded (JIT/cold-start)',
      proof_server: server,
      layer1_witness_generation: layer1,
      layer2_zk_proving: layer2,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(layer2.measured ? 0 : 2);
  })().catch((e) => {
    console.error(JSON.stringify({ ok: false, exit_code: 1, error: String(e && e.message || e) }, null, 2));
    process.exit(1);
  });
}

main();
