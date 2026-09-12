import test from 'node:test';
import assert from 'node:assert/strict';
import { proveEligibility } from '../packages/dapp/src/prove.mjs';
import { CohortError, ErrorCode } from '../packages/dapp/src/errors.mjs';

test('proveEligibility does not invent a tx when wallet is missing', async () => {
  await assert.rejects(
    () => proveEligibility({ facts: { age: 31, condition: true, medication: false } }),
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
    () => proveEligibility({ age: 31, facts: { age: 31, condition: true, medication: false } }),
    (err) => err.code === ErrorCode.PRIVATE_FIELD,
  );
});

test('proveEligibility with a proving wallet still refuses mock submit without ZK keys', async () => {
  const wallet = { api: { getProvingProvider: async () => ({}) } };
  await assert.rejects(
    () => proveEligibility({ wallet, facts: { age: 31, condition: true, medication: false } }),
    (err) => err.code === ErrorCode.ZK_CONFIG_MISSING,
  );
});
