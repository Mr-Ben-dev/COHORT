import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// B4 adversarial/refusal simulator tests for the issuer-attested hero circuits
// (attest, attestWithAttributes, proveAttested).
//
// All circuits run against the full-ZK compile-out TS
// (packages/contract/.compile-out/contract/index.js) with the Midnight
// compact-runtime simulator — zero chain calls, zero deploys, zero wallet.
//
// Every refusal below MUST reject in simulation. Positive controls exist only
// to prove the harness can reach the circuit's assertion points.
//
// DEMO-ISSUER LABEL: the demo issuer ID is installed once per session via
// (the B2 key ceremony has not installed a real secret yet), so the "correct"
// issuer secret in these tests is 32 zero bytes. A "wrong" issuer secret is
// any non-zero 32-byte value. When the ceremony runs, the zero-secret paths
// here must be re-keyed to the ceremonial secret.

const require = createRequire(import.meta.url);
const RT = require('@midnight-ntwrk/compact-runtime');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractUrl = pathToFileURL(
  path.join(root, 'packages/contract/.compile-out/contract/index.js'),
).href;

const { Contract, ledger, pureCircuits } = await import(contractUrl);

const bytes32 = (n) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

// Demo-issuer secret: a fixed non-zero 32-byte value installed via
// initIssuer() in boot(). disclose() is the identity at the value level.
const DEMO_ISSUER_SECRET = (() => {
  const a = new Uint8Array(32);
  for (let i = 0; i < 32; i++) a[i] = (0x9e + i * 13) % 256;
  return a;
})();

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

function makeHolder(overrides = {}) {
  return {
    age: 42n,
    condition: true,
    medication: false,
    secret: bytes32(7),
    blind: bytes32(9),
    holderSecret: bytes32(21),
    nonce: bytes32(33),
    issuerSecret: DEMO_ISSUER_SECRET.slice(),
    ...overrides,
  };
}

function boot() {
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(
    RT.createConstructorContext({ issuerSecret: DEMO_ISSUER_SECRET.slice() }, '0'.repeat(64)),
  );
  const addr = RT.sampleContractAddress();
  // Deployer flow: install the demo issuer ID once; all issuer gates below
  // check against this installed ledger value.
  const installed = contract.impureCircuits.initIssuer(
    RT.createCircuitContext(addr, '0'.repeat(64), ctor.currentContractState, {
      issuerSecret: DEMO_ISSUER_SECRET.slice(),
    }),
    DEMO_ISSUER_SECRET,
  );
  assert.equal(installed.result, true);
  return { contract, addr, state: installed.context.currentQueryContext.state };
}

function issue(session, { age = 42n, cond = true, med = false, holderSecret = bytes32(21), nonce = bytes32(33), issuerSecret = DEMO_ISSUER_SECRET.slice() } = {}) {
  const ctx = RT.createCircuitContext(session.addr, '0'.repeat(64), session.state, {
    issuerSecret,
  });
  const out = session.contract.impureCircuits.attestWithAttributes(
    ctx,
    age,
    cond,
    med,
    holderSecret,
    nonce,
  );
  assert.equal(out.result, true);
  return { ...session, state: out.context.currentQueryContext.state };
}

function prove(session, holder, { trialByte = 1, minAge = 30n, maxAge = 50n, requireCondition = true, forbidMedication = true } = {}) {
  const ctx = RT.createCircuitContext(session.addr, '0'.repeat(64), session.state, holder);
  return session.contract.impureCircuits.proveAttested(
    ctx,
    bytes32(trialByte),
    minAge,
    maxAge,
    requireCondition,
    forbidMedication,
  );
}

const pub = (session) => ledger(session.state);
const counterOf = (l, name) => BigInt(l[name].toString());
const setSize = (l, name) => Number(l[name].size().toString());

test('0 positive control (demo-issuer): issue + proveAttested succeed, counters move', () => {
  const s0 = boot();
  // issuerIdOf round-trips the disclose identity.
  const id = pureCircuits.issuerIdOf(DEMO_ISSUER_SECRET.slice());
  assert.deepEqual(Buffer.from(id), Buffer.from(DEMO_ISSUER_SECRET));

  const s1 = issue(s0);
  const l1 = pub(s1);
  assert.equal(setSize(l1, 'attestations'), 1);
  assert.equal(counterOf(l1, 'attestationsVerified'), 0n, 'issuance must not count as verification');

  const out = prove(s1, makeHolder());
  assert.equal(out.result, true);
  const l2 = ledger(out.context.currentQueryContext.state);
  assert.equal(counterOf(l2, 'proven'), 1n);
  assert.equal(counterOf(l2, 'attestationsVerified'), 1n);
  assert.equal(setSize(l2, 'spent'), 1, 'one trial nullifier recorded');
  assert.equal(setSize(l2, 'referrals'), 1, 'one referral recorded');
});

test('1 attest() with the WRONG issuer secret is rejected (demo-issuer)', () => {
  const s0 = boot();
  const attestation = pureCircuits.attestationOf(42n, true, false, bytes32(21), bytes32(33));

  // (a) direct attest() with a non-zero secret
  assert.throws(
    () => {
      const ctx = RT.createCircuitContext(s0.addr, '0'.repeat(64), s0.state, {
        issuerSecret: bytes32(99),
      });
      s0.contract.impureCircuits.attest(ctx, attestation);
    },
    /not the issuer/,
  );
  // (b) attestWithAttributes with a non-zero secret
  assert.throws(
    () => {
      const ctx = RT.createCircuitContext(s0.addr, '0'.repeat(64), s0.state, {
        issuerSecret: bytes32(1),
      });
      s0.contract.impureCircuits.attestWithAttributes(ctx, 42n, true, false, bytes32(21), bytes32(33));
    },
    /not the issuer/,
  );
  // nothing was published by the failed attempts: the correct-secret attest
  // below succeeds with set size exactly 1, so the rejected attempts inserted
  // nothing (any earlier insert would have made this call hit "already published").

  // the same attestation with the demo-issuer secret IS accepted
  const ctx = RT.createCircuitContext(s0.addr, '0'.repeat(64), s0.state, {
    issuerSecret: DEMO_ISSUER_SECRET.slice(),
  });
  const out = s0.contract.impureCircuits.attest(ctx, attestation);
  assert.equal(out.result, true);
  assert.equal(setSize(ledger(out.context.currentQueryContext.state), 'attestations'), 1);
});

test('2 proveAttested with TAMPERED attributes is rejected (membership fails)', () => {
  // issuer attests age 42 / condition true / medication false
  const s1 = issue(boot());

  // holder lies about age at prove time: recomputed attestation no longer matches
  assert.throws(
    () => prove(s1, makeHolder({ age: 43n })),
    /no issuer attestation for these attributes/,
  );
  // holder lies about the condition flag instead
  assert.throws(
    () => prove(s1, makeHolder({ condition: false })),
    /no issuer attestation for these attributes/,
  );

  // failed proofs move no counters and insert no nullifiers
  const l = pub(s1);
  assert.equal(counterOf(l, 'proven'), 0n);
  assert.equal(counterOf(l, 'attestationsVerified'), 0n);
  assert.equal(setSize(l, 'spent'), 0);
  assert.equal(setSize(l, 'referrals'), 0);
});

test('3 re-proving the same trial+holder twice is rejected (nullifier enforced)', () => {
  const s1 = issue(boot());
  const first = prove(s1, makeHolder(), { trialByte: 1 });
  assert.equal(first.result, true);
  const s2 = { ...s1, state: first.context.currentQueryContext.state };

  // same trial + same attested holder again -> nullifier gate fires
  assert.throws(
    () => prove(s2, makeHolder(), { trialByte: 1 }),
    /attestation already used for this trial/,
  );
  const lAfterFail = pub(s2);
  assert.equal(counterOf(lAfterFail, 'proven'), 1n, 'failed replay must not bump proven');
  assert.equal(counterOf(lAfterFail, 'attestationsVerified'), 1n);

  // a DIFFERENT trial with the same attestation succeeds: nullifiers differ
  const second = prove(s2, makeHolder({ blind: bytes32(10) }), { trialByte: 2 });
  assert.equal(second.result, true);
  const l = ledger(second.context.currentQueryContext.state);
  assert.equal(setSize(l, 'spent'), 2, 'two distinct trial nullifiers');
  assert.notDeepEqual(
    Buffer.from([...l.spent][0]),
    Buffer.from([...l.spent][1]),
    'nullifiers differ across trials',
  );
  assert.equal(counterOf(l, 'proven'), 2n);
  assert.equal(counterOf(l, 'attestationsVerified'), 2n);
  assert.equal(setSize(l, 'referrals'), 2, 'fresh blind per trial keeps referrals distinct');
});

test('4 proveAttested fails when the eligibility predicate fails on attested attributes (demo-issuer)', () => {
  // attested attributes: age 42. Trial requires minAge 45 -> "too young".
  const s1 = issue(boot(), { age: 42n });
  assert.throws(
    () => prove(s1, makeHolder({ age: 42n }), { minAge: 45n, maxAge: 60n }),
    /too young/,
  );
  // attested age 42 vs a trial for seniors: "too old"
  assert.throws(
    () => prove(s1, makeHolder({ age: 42n }), { minAge: 18n, maxAge: 30n }),
    /too old/,
  );
  // attested condition=true, but holder's attestation says medication=false while
  // the trial forbids medication — flips to a forbidden case by re-issuing:
  const s1b = issue(boot(), { med: true });
  assert.throws(
    () => prove(s1b, makeHolder({ medication: true }), { forbidMedication: true }),
    /medication excluded/,
  );

  // predicate failures are NOT counted as verifications and insert nothing
  const l = pub(s1);
  assert.equal(counterOf(l, 'proven'), 0n);
  assert.equal(counterOf(l, 'attestationsVerified'), 0n);
  assert.equal(setSize(l, 'spent'), 0);
  assert.equal(setSize(l, 'referrals'), 0);
});

test('5 proveAttested on an attestation never inserted is rejected (demo-issuer)', () => {
  // pristine ledger: prove() can only reach the membership assert on a fresh
  // boot; "no issuer attestation" fires before ANY insertion point in the
  // circuit, so a throw guarantees zero state change.
  const s0 = boot();

  assert.throws(
    () => prove(s0, makeHolder()),
    /no issuer attestation for these attributes/,
  );

  // the ledger is unpoisoned: a later issue+prove still behaves exactly once
  const s1 = issue(s0);
  const out = prove(s1, makeHolder());
  assert.equal(out.result, true);
  const l = ledger(out.context.currentQueryContext.state);
  assert.equal(setSize(l, 'spent'), 1, 'only the valid proof inserted a nullifier');
  assert.equal(counterOf(l, 'proven'), 1n);
  assert.equal(counterOf(l, 'attestationsVerified'), 1n);
});

test('6 attest() called twice with the same attestation is rejected (replay, demo-issuer)', () => {
  const s1 = issue(boot());
  const attestation = [...pub(s1).attestations][0];
  assert.ok(attestation instanceof Uint8Array && attestation.length === 32);

  // (a) direct attest() of the already-published commitment
  assert.throws(
    () => {
      const ctx = RT.createCircuitContext(s1.addr, '0'.repeat(64), s1.state, {
        issuerSecret: DEMO_ISSUER_SECRET.slice(),
      });
      s1.contract.impureCircuits.attest(ctx, attestation);
    },
    /attestation already published/,
  );

  // (b) attestWithAttributes recomputes the same commitment in-circuit -> same rejection
  assert.throws(
    () => {
      const ctx = RT.createCircuitContext(s1.addr, '0'.repeat(64), s1.state, {
        issuerSecret: DEMO_ISSUER_SECRET.slice(),
      });
      s1.contract.impureCircuits.attestWithAttributes(ctx, 42n, true, false, bytes32(21), bytes32(33));
    },
    /attestation already published/,
  );

  // set is unchanged: still exactly one attestation
  assert.equal(setSize(pub(s1), 'attestations'), 1);
});
