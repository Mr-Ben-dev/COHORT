import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// B3 simulator happy-path tests for the issuer-attested hero circuits.
// All circuits run against the full-ZK compile-out TS
// (packages/contract/.compile-out/contract/index.js) with the Midnight
// compact-runtime simulator — zero real chain calls.
//
// The demo issuer ID is installed once per session via initIssuer() (the
// deployer flow). Every issuer-gated circuit here is exercised with the
// DEMO ISSUER SECRET below. Tests are labeled "demo-issuer" accordingly.

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
// initIssuer() in boot(). NOTE: issuerIdOf(secret) is disclose() of the
// secret, i.e. identity.
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

function makeAttestee(overrides = {}) {
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

function boot(patient = makeAttestee()) {
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
  const addr = RT.sampleContractAddress();
  // Deployer flow: install the demo issuer ID once; every issuer-gated
  // circuit below runs against this installed ledger value.
  const installed = contract.impureCircuits.initIssuer(
    RT.createCircuitContext(addr, '0'.repeat(64), ctor.currentContractState, patient),
    DEMO_ISSUER_SECRET,
  );
  assert.equal(installed.result, true);
  return {
    contract,
    ctor: { currentContractState: installed.context.currentQueryContext.state },
    addr,
  };
}

function circuitCtx(session, privateState, contractState = session.ctor.currentContractState) {
  return RT.createCircuitContext(session.addr, '0'.repeat(64), contractState, privateState);
}

const publicLedger = (out) => ledger(out.context.currentQueryContext.state);
const stateOf = (session, out) => out.context.currentQueryContext.state;
const hex = (b) => RT.toHex(b);

test('demo-issuer: attestWithAttributes inserts the holder attestation', () => {
  const patient = makeAttestee();
  const session = boot(patient);
  const out = session.contract.impureCircuits.attestWithAttributes(
    circuitCtx(session, patient),
    42n,
    true,
    false,
    patient.holderSecret,
    patient.nonce,
  );
  assert.equal(out.result, true);
  const state = stateOf(session, out);
  const led = publicLedger(out);
  assert.equal(led.attestations.size().toString(), '1');
  const expected = pureCircuits.attestationOf(42n, true, false, patient.holderSecret, patient.nonce);
  assert.equal(expected.length, 32);
  assert.equal(led.attestations.member(expected), true);
  // the inserted entry is exactly the deterministic commitment of the inputs
  assert.equal(
    [...led.attestations].map(hex).includes(hex(expected)),
    true,
  );
  assert.equal(state !== session.ctor.currentContractState, true);
});

test('demo-issuer: attest(attestationOf(...)) publishes a holder attestation', () => {
  const patient = makeAttestee();
  const att = pureCircuits.attestationOf(42n, true, false, patient.holderSecret, patient.nonce);
  const session = boot(patient);
  const out = session.contract.impureCircuits.attest(circuitCtx(session, patient), att);
  assert.equal(out.result, true);
  const led = publicLedger(out);
  assert.equal(led.attestations.size().toString(), '1');
  assert.equal(led.attestations.member(att), true);
  assert.equal(led.attestations.member(bytes32(99)), false);
});

test('demo-issuer: proveAttested returns true for an eligible patient on attested attributes', () => {
  const patient = makeAttestee();
  const session = boot(patient);
  const attested = session.contract.impureCircuits.attestWithAttributes(
    circuitCtx(session, patient),
    42n,
    true,
    false,
    patient.holderSecret,
    patient.nonce,
  );
  assert.equal(attested.result, true);
  const nextState = stateOf(session, attested);
  const out = session.contract.impureCircuits.proveAttested(
    circuitCtx(session, patient, nextState),
    bytes32(1),
    18n,
    80n,
    true,
    true,
  );
  assert.equal(out.result, true);
  const led = publicLedger(out);
  assert.equal(led.attestationsVerified.toString(), '1');
  assert.equal(led.proven.toString(), '1');
  assert.equal(led.referrals.size().toString(), '1');
});

test('demo-issuer: initIssuer installs the issuer ID once, then locks', () => {
  const contract = new Contract(witnesses);
  const patient = makeAttestee();
  const addr = RT.sampleContractAddress();
  const ctor = contract.initialState(RT.createConstructorContext(patient, '0'.repeat(64)));
  const first = contract.impureCircuits.initIssuer(
    RT.createCircuitContext(addr, '0'.repeat(64), ctor.currentContractState, patient),
    DEMO_ISSUER_SECRET,
  );
  assert.equal(first.result, true);
  const led = ledger(first.context.currentQueryContext.state);
  assert.deepEqual(Buffer.from(led.issuerId), Buffer.from(DEMO_ISSUER_SECRET));
  // a second install must fail: the issuer ID is one-time
  assert.throws(() => {
    contract.impureCircuits.initIssuer(
      RT.createCircuitContext(addr, '0'.repeat(64), first.context.currentQueryContext.state, patient),
      bytes32(7),
    );
  }, /issuer already initialized/);
  // issuerIdOf remains the disclose-identity helper
  const helper = pureCircuits.issuerIdOf(DEMO_ISSUER_SECRET);
  assert.equal(helper.length, 32);
  assert.deepEqual(Buffer.from(helper), Buffer.from(DEMO_ISSUER_SECRET));
});

test('attestationOf is deterministic for identical inputs and holder-bound', () => {
  const hs = bytes32(21);
  const nonce = bytes32(33);
  const a = pureCircuits.attestationOf(42n, true, false, hs, nonce);
  const b = pureCircuits.attestationOf(42n, true, false, hs, nonce);
  assert.deepEqual(Buffer.from(a), Buffer.from(b)); // deterministic
  const c = pureCircuits.attestationOf(42n, true, false, hs, bytes32(34));
  assert.notDeepEqual(Buffer.from(a), Buffer.from(c)); // nonce differs
  const d = pureCircuits.attestationOf(42n, true, false, bytes32(22), nonce);
  assert.notDeepEqual(Buffer.from(a), Buffer.from(d)); // holder secret differs
  const e = pureCircuits.attestationOf(43n, true, false, hs, nonce);
  assert.notDeepEqual(Buffer.from(a), Buffer.from(e)); // attributes differ
});

test('demo-issuer: proveAttested nullifier differs per trialId (program-scoped)', () => {
  const patient = makeAttestee();
  const session = boot(patient);
  const attested = session.contract.impureCircuits.attestWithAttributes(
    circuitCtx(session, patient),
    42n,
    true,
    false,
    patient.holderSecret,
    patient.nonce,
  );
  let state = stateOf(session, attested);
  const first = session.contract.impureCircuits.proveAttested(
    circuitCtx(session, patient, state),
    bytes32(1),
    18n,
    80n,
    true,
    true,
  );
  assert.equal(first.result, true);
  state = stateOf(session, first);
  const second = session.contract.impureCircuits.proveAttested(
    circuitCtx(session, patient, state),
    bytes32(2),
    18n,
    80n,
    true,
    true,
  );
  assert.equal(second.result, true);
  const spent = [...publicLedger(second).spent].map(hex);
  assert.equal(spent.length, 2);
  assert.notEqual(spent[0], spent[1]);
  assert.equal(publicLedger(second).attestationsVerified.toString(), '2');
});
