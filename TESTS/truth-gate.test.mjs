import test from 'node:test';
import assert from 'node:assert/strict';
import {
  waitForLedgerEffect,
  truthGatedCall,
  fetchContractState,
  isClaimedSuccess,
  isClaimedFailure,
  assertClaimedSuccess,
} from '../packages/dapp/src/truth-gate.mjs';
import { blockfrostTokenConfigured } from '../packages/dapp/src/blockfrost.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from '../packages/dapp/src/claims.mjs';

const CONTRACT = '0x' + 'ab'.repeat(32);
const TX_HASH = '0x' + 'cd'.repeat(32);

/**
 * Mock Blockfrost GraphQL responder. `states` is an array of fake ledger
 * state hex strings served in poll order (the last one repeats forever).
 * Records every request for assertions.
 */
function mockBlockfrost(states, { blockHeight = 777, actionTypename = 'ContractCall' } = {}) {
  const calls = [];
  let n = 0;
  const fetch = async (url, opts) => {
    calls.push({ url, opts });
    const body = JSON.parse(opts.body);
    assert.equal(body.variables.address, CONTRACT);
    const state = states[Math.min(n, states.length - 1)];
    n += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          contractAction: {
            __typename: actionTypename,
            address: CONTRACT,
            state,
            transaction: { hash: TX_HASH, block: { height: blockHeight } },
          },
        },
      }),
    };
  };
  return { fetch, calls, pollCount: () => n };
}

const counterOf = (snapshot) => parseInt(snapshot.stateHex.slice(2, 10), 16);
const stateOf = (counter) => '0x' + counter.toString(16).padStart(8, '0');

test('(1) success path: confirms after N polls once the ledger effect is observed', async () => {
  const { fetch, pollCount } = mockBlockfrost([
    stateOf(5),
    stateOf(5),
    stateOf(6), // effect lands on the 3rd poll
  ]);
  const baseline = 5;
  const result = await waitForLedgerEffect({
    contractAddress: CONTRACT,
    txHash: TX_HASH,
    expectedPredicate: (snapshot) => counterOf(snapshot) > baseline,
    pollIntervalMs: 5,
    timeoutMs: 5000,
    fetch,
  });
  assert.equal(result.confirmed, true);
  assert.equal(result.txHash, TX_HASH);
  assert.equal(result.observedAtBlock, 777);
  assert.equal(result.attempts, 3);
  assert.equal(pollCount(), 3);
  assert.equal(isClaimedSuccess(result), true);
  assert.equal(isClaimedFailure(result), false);
  assert.equal(assertClaimedSuccess(result), result);
});

test('(2) timeout path: returns confirmed:false when the effect never appears', async () => {
  const { fetch, pollCount } = mockBlockfrost([stateOf(5)]);
  const baseline = 5;
  const result = await waitForLedgerEffect({
    contractAddress: CONTRACT,
    txHash: TX_HASH,
    expectedPredicate: (snapshot) => counterOf(snapshot) > baseline,
    pollIntervalMs: 5,
    timeoutMs: 60,
    fetch,
  });
  assert.equal(result.confirmed, false);
  assert.equal(result.reason, 'timeout');
  assert.equal(result.txHash, TX_HASH);
  assert.ok(result.attempts >= 1);
  assert.equal(pollCount(), result.attempts);
  assert.equal(isClaimedSuccess(result), false);
  assert.equal(isClaimedFailure(result), true);
  assert.throws(() => assertClaimedSuccess(result), /Success UI blocked/);
});

test('(3) wallet-accepted tx with NO ledger effect never yields success', async () => {
  // The wallet accepted the submission (promise resolved with a hash),
  // but the on-chain counter never moves: the gate must not confirm.
  const { fetch } = mockBlockfrost([stateOf(5)]);
  const baseline = 5;
  const txPromise = Promise.resolve({ txHash: TX_HASH });
  const result = await truthGatedCall(txPromise, {
    contractAddress: CONTRACT,
    expectedPredicate: (snapshot) => counterOf(snapshot) > baseline,
    pollIntervalMs: 5,
    timeoutMs: 60,
    fetch,
  });
  assert.equal(result.confirmed, false);
  assert.equal(result.reason, 'timeout');
  assert.equal(result.txHash, TX_HASH);
  assert.equal(isClaimedSuccess(result), false);
  assert.throws(() => assertClaimedSuccess(result), /Success UI blocked/);
});

test('(4) tx submission rejection propagates immediately (no polling, no confirmation)', async () => {
  const { fetch, calls } = mockBlockfrost([stateOf(6)]);
  const rejection = new Error('wallet: user rejected the transaction');
  await assert.rejects(
    () =>
      truthGatedCall(Promise.reject(rejection), {
        contractAddress: CONTRACT,
        expectedPredicate: () => true,
        fetch,
      }),
    (err) => err === rejection,
  );
  assert.equal(calls.length, 0, 'must not poll the indexer after a rejected submission');
});

test('isClaimed helpers: unbranded lookalikes are not claims', () => {
  assert.equal(isClaimedSuccess({ confirmed: true }), false);
  assert.equal(isClaimedFailure({ confirmed: false }), false);
  assert.equal(isClaimedSuccess(null), false);
  assert.equal(isClaimedSuccess(undefined), false);
  assert.equal(isClaimedSuccess({ confirmed: true, txHash: TX_HASH }), false);
  assert.throws(() => assertClaimedSuccess({ confirmed: true }), /Success UI blocked/);
});

test('truthGatedCall accepts a bare tx-hash string and a gateOpts.txHash fallback', async () => {
  const { fetch } = mockBlockfrost([stateOf(9)]);
  const r1 = await truthGatedCall(Promise.resolve(TX_HASH), {
    contractAddress: CONTRACT,
    expectedPredicate: (s) => counterOf(s) === 9,
    pollIntervalMs: 5,
    timeoutMs: 1000,
    fetch,
  });
  assert.equal(r1.confirmed, true);
  assert.equal(r1.txHash, TX_HASH);

  const { fetch: fetch2 } = mockBlockfrost([stateOf(9)]);
  const r2 = await truthGatedCall(Promise.resolve({}), {
    contractAddress: CONTRACT,
    txHash: '0xfallback',
    expectedPredicate: (s) => counterOf(s) === 9,
    pollIntervalMs: 5,
    timeoutMs: 1000,
    fetch: fetch2,
  });
  assert.equal(r2.confirmed, true);
  assert.equal(r2.txHash, '0xfallback');
});

test('LIVE: Blockfrost contractAction read for the deployed COHORT contract', async (t) => {
  if (!blockfrostTokenConfigured()) {
    t.skip('BLOCKFROST_PROJECT_ID not set — live indexer read skipped (not a failure)');
    return;
  }
  const snapshot = await fetchContractState({
    contractAddress: PROVE_ELIGIBLE_CLAIMS.contractAddress,
  });
  assert.ok(snapshot, 'expected a contract action for the deployed contract');
  assert.match(snapshot.stateHex, /^[0-9a-fA-F]+$/);
  assert.ok(snapshot.stateHex.length > 0);
  assert.ok(Number.isInteger(snapshot.blockHeight) && snapshot.blockHeight > 0);
  assert.ok(
    ['ContractDeploy', 'ContractCall', 'ContractUpdate'].includes(snapshot.actionTypename),
  );
});
