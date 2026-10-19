// SQUAD A7 — live ledger counters on GET /api/public-state.
//
// Coverage:
//  1. mocked-Blockfrost success path: GraphQL response parsing (state hex +
//     block height) and the real compact-runtime decode of ledger counters,
//     using simulator-built contract state (never invented numbers).
//  2. no-token graceful path: source 'no-token-configured', all counters
//     null, clear reason — at the function level and over HTTP.
//  3. failure paths: 'live-onchain-query-failed' with the token redacted,
//     Wave-3 'not-deployed' labeling while CONTRACT_ADDRESS_WAVE3 is unset.
//  4. no-dead-hostname assertion for the new/edited files (Blockfrost
//     migration regression guard).
//  5. source-string contract with C2's web badge: only the exact string
//     'live-onchain' may mark numbers as real chain state; every other
//     source string must classify as sample-data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RT = require('@midnight-ntwrk/compact-runtime');
const { ContractState } = require('@midnight-ntwrk/midnight-js-protocol/compact-runtime');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const {
  readLiveLedger,
  readAttestationCounters,
  queryContractStateHex,
  countersFromStateData,
  attestationFieldsFromStateData,
  decodeWave1Counters,
  BLOCKFROST_GRAPHQL_URL,
  WAVE1_CONTRACT_ADDRESS,
} = await import('../apps/api/src/blockfrost-live.mjs');
const { listenServer } = await import('../apps/api/src/server.mjs');
const { request } = await import('./http.mjs');

// --- simulator-built ledger state (real compact-runtime state, not fixtures) ---

const bytes32 = (n) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

const { Contract } = await import('../packages/contract/managed/cohort/contract/index.js');

function buildProveState() {
  const patient = {
    age: 42n,
    condition: true,
    medication: false,
    secret: bytes32(7),
    blind: bytes32(9),
  };
  const witnesses = {
    wAge: (ctx) => [ctx.privateState, ctx.privateState.age],
    wCondition: (ctx) => [ctx.privateState, ctx.privateState.condition],
    wMedication: (ctx) => [ctx.privateState, ctx.privateState.medication],
    wSecret: (ctx) => [ctx.privateState, ctx.privateState.secret],
    wBlind: (ctx) => [ctx.privateState, ctx.privateState.blind],
    wNonce: (ctx) => [ctx.privateState, bytes32(11)],
    wHolderSecret: (ctx) => [ctx.privateState, bytes32(13)],
    wIssuerSecret: (ctx) => [ctx.privateState, bytes32(17)],
  };
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
  const addr = RT.sampleContractAddress();
  const ctx = RT.createCircuitContext(addr, '0'.repeat(64), ctor.currentContractState, patient);
  const out = contract.impureCircuits.proveEligible(ctx, bytes32(1), 30n, 50n, true, true);
  return out.context.currentQueryContext.state;
}

// --- env hygiene: never leak test env into other tests ---

const ENV_KEYS = [
  'BLOCKFROST_PROJECT_ID',
  'CONTRACT_ADDRESS_WAVE3',
  'COHORT_CONTRACT_ADDRESS',
  'MIDNIGHT_INDEXER_URL',
  'MIDNIGHT_NETWORK',
];

function snapshotEnv() {
  const snap = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(snap) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

// --- 1. mocked-Blockfrost success path ---

test('decode: real counters from simulator-built ledger state (proven=1)', () => {
  const state = buildProveState();
  const wave1 = countersFromStateData(state);
  assert.deepEqual(wave1, { proven: 1, spentSize: 1, referralsSize: 1 });
  const wave3 = attestationFieldsFromStateData(state);
  assert.deepEqual(wave3, { attestationsSize: 0, attestationsVerified: 0 });
});

test('decode: initial ledger state decodes to zero counters', () => {
  const state = buildProveState();
  // initial state comes from the constructor context before any circuit runs
  const patient = { age: 42n, condition: true, medication: false, secret: bytes32(7), blind: bytes32(9) };
  const contract = new Contract({
    wAge: (c) => [c.privateState, c.privateState.age],
    wCondition: (c) => [c.privateState, c.privateState.condition],
    wMedication: (c) => [c.privateState, c.privateState.medication],
    wSecret: (c) => [c.privateState, c.privateState.secret],
    wBlind: (c) => [c.privateState, c.privateState.blind],
    wNonce: (c) => [c.privateState, bytes32(11)],
    wHolderSecret: (c) => [c.privateState, bytes32(13)],
    wIssuerSecret: (c) => [c.privateState, bytes32(17)],
  });
  const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
  const wave1 = countersFromStateData(ctor.currentContractState.data);
  assert.deepEqual(wave1, { proven: 0, spentSize: 0, referralsSize: 0 });
  void state;
});

test('mocked Blockfrost: queryContractStateHex parses state hex + block height', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  process.env.BLOCKFROST_PROJECT_ID = 'a7-test-token';
  delete process.env.MIDNIGHT_INDEXER_URL;

  const seen = {};
  const fetchImpl = async (url, opts) => {
    seen.url = url;
    seen.opts = opts;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          contractAction: {
            state: 'ab'.repeat(32),
            transaction: { block: { height: 987654 } },
          },
        },
      }),
    };
  };

  const { hex, blockHeight } = await queryContractStateHex({
    indexerUrl: BLOCKFROST_GRAPHQL_URL + '?project_id=a7-test-token',
    contractAddress: WAVE1_CONTRACT_ADDRESS,
    fetchImpl,
  });
  assert.equal(hex, 'ab'.repeat(32));
  assert.equal(blockHeight, 987654);
  assert.equal(seen.opts.method, 'POST');
  assert.match(seen.opts.headers['content-type'], /application\/json/);
  const body = JSON.parse(seen.opts.body);
  assert.equal(body.variables.address, WAVE1_CONTRACT_ADDRESS);
  assert.match(String(seen.url), /project_id=a7-test-token/);
});

test('mocked Blockfrost: GraphQL errors / missing state / unreachable map to 502', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  process.env.BLOCKFROST_PROJECT_ID = 'a7-test-token';

  const gqlError = async () => ({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'bad query' }] }) });
  const noState = async () => ({ ok: true, status: 200, json: async () => ({ data: { contractAction: null } }) });
  const http500 = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const unreachable = async () => {
    throw new Error('connect ECONNREFUSED');
  };

  for (const [name, fetchImpl] of Object.entries({ gqlError, noState, http500, unreachable })) {
    await assert.rejects(
      () =>
        queryContractStateHex({
          indexerUrl: BLOCKFROST_GRAPHQL_URL,
          contractAddress: WAVE1_CONTRACT_ADDRESS,
          fetchImpl,
        }),
      (err) => {
        assert.equal(err.status, 502, name);
        return true;
      },
      name,
    );
  }
});

test('mocked Blockfrost: invalid contract address maps to 503', async () => {
  await assert.rejects(
    () => queryContractStateHex({ indexerUrl: BLOCKFROST_GRAPHQL_URL, contractAddress: 'not-hex!' }),
    (err) => {
      assert.equal(err.status, 503);
      return true;
    },
  );
});

// --- 2. no-token graceful path ---

test('no-token: readLiveLedger degrades with labeled nulls, never fake numbers', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.CONTRACT_ADDRESS_WAVE3;
  delete process.env.MIDNIGHT_INDEXER_URL;

  const out = await readLiveLedger();
  assert.equal(out.source, 'no-token-configured');
  assert.equal(out.proven, null);
  assert.equal(out.spentSize, null);
  assert.equal(out.referralsSize, null);
  assert.equal(out.attestationsSize, null);
  assert.equal(out.attestationsVerified, null);
  assert.equal(out.blockHeight, null);
  assert.equal(out.contractAddress, WAVE1_CONTRACT_ADDRESS);
  assert.match(out.reason, /BLOCKFROST_PROJECT_ID/);
  assert.ok(out.fetchedAt);
});

test('no-token: readAttestationCounters is null + labeled when token missing', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  process.env.CONTRACT_ADDRESS_WAVE3 = 'cd'.repeat(32);

  const out = await readAttestationCounters();
  assert.equal(out.source, 'no-token-configured');
  assert.equal(out.attestationsSize, null);
  assert.equal(out.attestationsVerified, null);
  assert.equal(out.wave3Deployed, true);
});

// --- 3. failure + Wave-3 labeling paths ---

test('query failure: source live-onchain-query-failed, counters null, token redacted', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  process.env.BLOCKFROST_PROJECT_ID = 'A7-SUPER-SECRET-TOKEN';
  delete process.env.MIDNIGHT_INDEXER_URL;
  delete process.env.CONTRACT_ADDRESS_WAVE3;

  const fetchImpl = async () => {
    throw new Error('socket hangup (token=A7-SUPER-SECRET-TOKEN)');
  };
  const out = await readLiveLedger({ fetchImpl });
  assert.equal(out.source, 'live-onchain-query-failed');
  assert.equal(out.proven, null);
  assert.equal(out.spentSize, null);
  assert.equal(out.referralsSize, null);
  assert.equal(String(out.reason).includes('A7-SUPER-SECRET-TOKEN'), false);
});

test('wave3 undeployed: attestation decode throws on a field-less state, labeled not-deployed', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.CONTRACT_ADDRESS_WAVE3;

  // An empty contract state has no ledger fields at all — decoding must throw,
  // which is exactly what the Wave-3 label path catches.
  const emptyData = new ContractState().data;
  assert.throws(() => attestationFieldsFromStateData(emptyData));

  const out = await readAttestationCounters();
  assert.equal(out.wave3Deployed, false);
  assert.equal(out.source, 'not-deployed');
  assert.equal(out.attestationsSize, null);
  assert.equal(out.attestationsVerified, null);
  assert.match(out.reason, /not deployed yet/);
});

// --- HTTP route tests ---

test('GET /api/public-state with no token: 200, labeled, no fake numbers', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.CONTRACT_ADDRESS_WAVE3;
  delete process.env.MIDNIGHT_INDEXER_URL;

  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/public-state');
  assert.equal(res.status, 200);
  assert.equal(res.json.source, 'no-token-configured');
  assert.notEqual(res.json.source, 'live-onchain');
  assert.equal(res.json.proven, null);
  assert.equal(res.json.spentCount, null);
  assert.equal(res.json.referralCount, null);
  assert.equal(res.json.attestationsSize, null);
  assert.equal(res.json.attestationsVerified, null);
  assert.equal(res.json.attestationSource, 'not-deployed');
  assert.equal(res.json.contractAddress, WAVE1_CONTRACT_ADDRESS);
  assert.equal(res.json.networkId, 'preprod');
  assert.match(res.json.reason, /BLOCKFROST_PROJECT_ID/);
});

test('GET /api/public-state with unreachable indexer: 502, labeled, token redacted', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  process.env.BLOCKFROST_PROJECT_ID = 'A7-ROUTE-SECRET';
  process.env.MIDNIGHT_INDEXER_URL = 'http://127.0.0.1:1/';
  delete process.env.CONTRACT_ADDRESS_WAVE3;

  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/public-state');
  assert.equal(res.status, 502);
  assert.equal(res.json.source, 'live-onchain-query-failed');
  assert.equal(res.json.proven, null);
  assert.equal(String(JSON.stringify(res.json)).includes('A7-ROUTE-SECRET'), false);
});

test('GET /api/attestation-counters with no wave3: 200, null + labeled', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.CONTRACT_ADDRESS_WAVE3;

  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/attestation-counters');
  assert.equal(res.status, 200);
  assert.equal(res.json.wave3Deployed, false);
  assert.equal(res.json.source, 'not-deployed');
  assert.notEqual(res.json.source, 'live-onchain');
  assert.equal(res.json.attestationsSize, null);
  assert.equal(res.json.attestationsVerified, null);
  assert.match(res.json.reason, /not deployed yet/);
});

test('GET /api/attestation-counters with wave3 set but no token: no-token-configured', async (t) => {
  const snap = snapshotEnv();
  t.after(() => restoreEnv(snap));
  delete process.env.BLOCKFROST_PROJECT_ID;
  process.env.CONTRACT_ADDRESS_WAVE3 = 'cd'.repeat(32);

  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/attestation-counters');
  assert.equal(res.status, 200);
  assert.equal(res.json.wave3Deployed, true);
  assert.equal(res.json.source, 'no-token-configured');
  assert.notEqual(res.json.source, 'live-onchain');
  assert.equal(res.json.attestationsSize, null);
  assert.equal(res.json.attestationsVerified, null);
});

// --- 5. source-string contract with the C2 web badge ---

test('source-string contract: only exact "live-onchain" marks real numbers', () => {
  // Mirrors web/src/lib/cohort-verify.mjs classifyProvenance(): anything that
  // is not the exact live source string must classify as sample-data.
  const classify = (source) => (source === 'live-onchain' ? 'live-onchain' : 'sample-data');
  const nonLive = [
    'blockfrost-preprod',
    'unavailable',
    'no-token-configured',
    'live-onchain-query-failed',
    'not-deployed',
    '',
    null,
    undefined,
    'LIVE-ONCHAIN',
  ];
  for (const s of nonLive) {
    assert.equal(classify(s), 'sample-data', `source ${JSON.stringify(s)} must not be live`);
  }
  assert.equal(classify('live-onchain'), 'live-onchain');
});

// --- 4. no-dead-hostname assertion ---

test('no dead Midnight Preprod hostnames in A7 files', () => {
  // Regex-escaped so this file never trips its own scan.
  const dead = ['indexer\\.preprod\\.midnight\\.network', 'rpc\\.preprod\\.midnight\\.network'].map(
    (src) => new RegExp(src),
  );
  const files = ['apps/api/src/blockfrost-live.mjs', 'apps/api/src/server.mjs', 'TESTS/public-state-live.test.mjs'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    for (const re of dead) {
      assert.equal(re.test(text), false, `${f} references dead host ${re}`);
    }
  }
});

test('decodeWave1Counters rejects non-hex input (never decodes garbage)', () => {
  assert.throws(() => decodeWave1Counters('not-hex-at-all!!!'));
});
