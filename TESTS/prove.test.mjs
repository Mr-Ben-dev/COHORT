import test from 'node:test';
import assert from 'node:assert/strict';
import { proveEligibility, mintWitnessSecrets } from '../packages/dapp/src/prove.mjs';
import { CohortError, ErrorCode } from '../packages/dapp/src/errors.mjs';
import { encodeTrialId } from '../packages/dapp/src/encoding.mjs';

const TRIAL = {
  trialId: 'NCT07153614',
  minAge: 18,
  maxAge: 80,
  requireCondition: true,
  forbidMedication: true,
};

test('encodeTrialId pads NCT ids to 32 bytes', () => {
  const b = encodeTrialId('NCT07153614');
  assert.equal(b.length, 32);
  assert.equal(new TextDecoder().decode(b.subarray(0, 11)), 'NCT07153614');
  assert.equal(b[11], 0);
});

test('proveEligibility does not invent a tx when wallet is missing', async () => {
  await assert.rejects(
    () => proveEligibility({ trial: TRIAL, facts: { age: 31, condition: true, medication: false } }),
    (err) => {
      assert.equal(err instanceof CohortError, true);
      assert.equal(err.code, ErrorCode.WALLET_UNAVAILABLE);
      assert.equal(err.txHash, undefined);
      return true;
    },
  );
});

test('proveEligibility rejects private fields on the public envelope', async () => {
  await assert.rejects(
    () => proveEligibility({ age: 31, trial: TRIAL, facts: { age: 31, condition: true, medication: false } }),
    (err) => err.code === ErrorCode.PRIVATE_FIELD,
  );
});

test('proveEligibility refuses local preview failure without submitting', async () => {
  await assert.rejects(
    () => proveEligibility({ trial: TRIAL, facts: { age: 17, condition: true, medication: false } }),
    (err) => {
      assert.equal(err.code, ErrorCode.UNSUPPORTED_CRITERIA);
      assert.equal(err.txHash, undefined);
      return true;
    },
  );
});

test('proveEligibility with a proving wallet still refuses mock submit without ZK keys', async () => {
  const wallet = {
    api: {
      getProvingProvider: async () => ({}),
      getShieldedAddresses: async () => ({ shieldedCoinPublicKey: 'aa', shieldedEncryptionPublicKey: 'bb' }),
      balanceUnsealedTransaction: async () => ({ tx: '00' }),
      submitTransaction: async () => {},
    },
  };
  await assert.rejects(
    () =>
      proveEligibility({
        wallet,
        trial: TRIAL,
        facts: { age: 31, condition: true, medication: false },
        zkConfigProvider: {
          getVerifierKey: async () => {
            throw new Error('missing');
          },
        },
      }),
    (err) => {
      assert.equal(err.code, ErrorCode.ZK_CONFIG_MISSING);
      assert.equal(err.txHash, undefined);
      return true;
    },
  );
});

test('proveEligibility with incomplete wallet and hosted keys still does not invent a hash', async () => {
  const wallet = { api: { getProvingProvider: async () => ({}) } };
  await assert.rejects(
    () => proveEligibility({ wallet, trial: TRIAL, facts: { age: 31, condition: true, medication: false } }),
    (err) => {
      assert.equal(err instanceof CohortError, true);
      assert.equal(err.txHash, undefined);
      assert.notEqual(err.code, undefined);
      return true;
    },
  );
});

test('mintWitnessSecrets is unique per call unless a secret is supplied', () => {
  const a = mintWitnessSecrets({});
  const b = mintWitnessSecrets({});
  assert.equal(a.secret.length, 32);
  assert.equal(a.blind.length, 32);
  assert.notDeepEqual(Buffer.from(a.secret), Buffer.from(b.secret));
  assert.notDeepEqual(Buffer.from(a.blind), Buffer.from(b.blind));
  const secret = new Uint8Array(32).fill(7);
  const blind = new Uint8Array(32).fill(9);
  const reused = mintWitnessSecrets({ secret, blind });
  assert.deepEqual(Buffer.from(reused.secret), Buffer.from(secret));
  assert.deepEqual(Buffer.from(reused.blind), Buffer.from(blind));
});
