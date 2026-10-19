/**
 * SQUAD B7 unit tests — packages/dapp/src/attest.mjs.
 *
 * Pure functions are tested fully (no network). Network paths
 * (attestViaIssuer / proveAttestedFlow / readAttestationSet live runs) are
 * marked as requiring a live provider + deployed attestation contract and
 * are SKIPPED here; only their validation/error paths are exercised.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttestationInputs,
  issuerIdOf,
  attestViaIssuer,
  proveAttestedFlow,
  readAttestationSet,
  resolveAttestContractAddress,
  loadGeneratedContract,
  setSizeToNumber,
  ATTEST_CIRCUITS,
  ATTEST_MAX_READ_MEMBERS,
} from '../packages/dapp/src/attest.mjs';
import { CohortError } from '../packages/dapp/src/errors.mjs';

const b32 = (fill) => new Uint8Array(32).fill(fill);

test('buildAttestationInputs: returns 32-byte attestation matching the pure circuit', async () => {
  const attrs = { age: 34, condition: true, medication: false };
  const holderSecret = b32(1);
  const nonce = b32(2);
  const { attestation, inputs } = await buildAttestationInputs(attrs, holderSecret, nonce);
  assert.ok(attestation instanceof Uint8Array);
  assert.equal(attestation.length, 32);
  const { pureCircuits } = await loadGeneratedContract();
  const expected = pureCircuits.attestationOf(34n, true, false, holderSecret, nonce);
  assert.ok(Buffer.from(attestation).equals(Buffer.from(expected)));
  assert.deepEqual(inputs, { age: 34, condition: true, medication: false, holderSecret, nonce });
});

test('buildAttestationInputs: deterministic for the same inputs, distinct for a different nonce', async () => {
  const a = await buildAttestationInputs({ age: 42, condition: false, medication: true }, b32(7), b32(8));
  const b = await buildAttestationInputs({ age: 42, condition: false, medication: true }, b32(7), b32(8));
  const c = await buildAttestationInputs({ age: 42, condition: false, medication: true }, b32(7), b32(9));
  assert.ok(Buffer.from(a.attestation).equals(Buffer.from(b.attestation)));
  assert.ok(!Buffer.from(a.attestation).equals(Buffer.from(c.attestation)));
});

test('buildAttestationInputs: rejects bad shapes (no silent defaults)', async () => {
  await assert.rejects(buildAttestationInputs(null, b32(1), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: 256, condition: true, medication: false }, b32(1), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: -1, condition: true, medication: false }, b32(1), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: 30.5, condition: true, medication: false }, b32(1), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: 34, condition: 'yes', medication: false }, b32(1), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: 34, condition: true, medication: false }, new Uint8Array(16), b32(2)), CohortError);
  await assert.rejects(buildAttestationInputs({ age: 34, condition: true, medication: false }, b32(1), [1, 2, 3]), CohortError);
});

test('issuerIdOf: returns 32 bytes from a 32-byte secret (pure, injected)', async () => {
  const id = await issuerIdOf(b32(9));
  assert.ok(id instanceof Uint8Array);
  assert.equal(id.length, 32);
  await assert.rejects(issuerIdOf(new Uint8Array(31)), CohortError);
});

test('setSizeToNumber: decodes compact Either size (big-endian left) and plain bigint', () => {
  const left = new Uint8Array(32);
  left[31] = 5;
  assert.equal(setSizeToNumber({ is_left: false, left, right: new Uint8Array(32) }), 5);
  assert.equal(setSizeToNumber(12n), 12);
  assert.equal(setSizeToNumber(0), 0);
  assert.throws(() => setSizeToNumber({ nope: true }), CohortError);
  assert.throws(() => setSizeToNumber('5'), CohortError);
});

test('resolveAttestContractAddress: throws NOT_IMPLEMENTED until the new contract is deployed', () => {
  delete process.env.COHORT_ATTEST_CONTRACT_ADDRESS;
  assert.throws(() => resolveAttestContractAddress(), (err) => {
    assert.ok(err instanceof CohortError);
    assert.equal(err.code, 'NOT_IMPLEMENTED');
    return true;
  });
  assert.equal(resolveAttestContractAddress({ contractAddress: 'abc123' }), 'abc123');
});

test('attestViaIssuer: rejects a mock/partial provider with a real error', async () => {
  await assert.rejects(
    () => attestViaIssuer({}, b32(3), b32(4)),
    (err) => {
      assert.ok(err instanceof CohortError);
      assert.ok(/createCallProviders|mock/i.test(err.message));
      return true;
    },
  );
});

test('attestViaIssuer: rejects malformed issuerSecret/attestation before touching the network', async () => {
  const fake = { privateStateProvider: { set: async () => {} }, proofProvider: {}, walletProvider: {}, contractAddress: 'x' };
  await assert.rejects(() => attestViaIssuer(fake, new Uint8Array(16), b32(4)), CohortError);
  await assert.rejects(() => attestViaIssuer(fake, b32(3), new Uint8Array(0)), CohortError);
});

test('proveAttestedFlow: rejects a malformed trialPredicate and holderSecrets', async () => {
  const fake = { privateStateProvider: { set: async () => {} }, proofProvider: {}, walletProvider: {}, contractAddress: 'x' };
  const goodHolder = { age: 40, condition: true, medication: false, holderSecret: b32(1), nonce: b32(2) };
  await assert.rejects(() => proveAttestedFlow(fake, { trialId: 't1' }, goodHolder), CohortError);
  await assert.rejects(
    () => proveAttestedFlow(fake, { trialId: 't1', minAge: 18, maxAge: 65, requireCondition: true, forbidMedication: false }, { age: 40 }),
    CohortError,
  );
});

test('readAttestationSet: surfaces indexer failure as a real error (no silent fallback)', async () => {
  const failing = {
    contractAddress: 'deadbeef',
    queryContractState: async () => {
      throw new Error('boom');
    },
  };
  await assert.rejects(
    () => readAttestationSet(failing),
    (err) => {
      assert.ok(err instanceof CohortError);
      assert.equal(err.code, 'INDEXER_UNAVAILABLE');
      return true;
    },
  );
});

test('readAttestationSet: throws when no contract address is configured', async () => {
  delete process.env.COHORT_ATTEST_CONTRACT_ADDRESS;
  await assert.rejects(() => readAttestationSet(undefined, {}), (err) => {
    assert.ok(err instanceof CohortError);
    assert.equal(err.code, 'NOT_IMPLEMENTED');
    return true;
  });
});

test('constants: circuit ids match the compiled contract; read cap is sane', () => {
  assert.deepEqual(Object.values(ATTEST_CIRCUITS).sort(), ['attest', 'attestWithAttributes', 'proveAttested']);
  assert.ok(ATTEST_MAX_READ_MEMBERS > 0);
});

// ---------------------------------------------------------------------------
// Live paths — require a connected wallet, funded DUST, a live provider and
// a DEPLOYED attestation contract (not yet deployed as of this writing).
// Skipped in CI; run manually once the contract address is set.
// ---------------------------------------------------------------------------
test('LIVE: attestViaIssuer publishes into the on-chain attestations set', { skip: 'requires live provider + deployed attestation contract (COHORT_ATTEST_CONTRACT_ADDRESS unset)' }, async () => {
  await attestViaIssuer(null, null, null);
});

test('LIVE: proveAttestedFlow proves qualification from an issuer attestation', { skip: 'requires live provider + deployed attestation contract (COHORT_ATTEST_CONTRACT_ADDRESS unset)' }, async () => {
  await proveAttestedFlow(null, null, null);
});

test('LIVE: readAttestationSet decodes the on-chain attestations set via ledger()', { skip: 'requires live provider + deployed attestation contract (COHORT_ATTEST_CONTRACT_ADDRESS unset)' }, async () => {
  const out = await readAttestationSet(undefined, {});
  assert.ok(out.attestations.every((h) => /^[0-9a-f]{64}$/.test(h)));
});
