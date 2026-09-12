import test from 'node:test';
import assert from 'node:assert/strict';
import { CohortDapp } from '../packages/dapp/src/index.mjs';

test('Preprod indexer queryContractState + ledger() returns proven >= 1', async () => {
  const out = await CohortDapp.getPublicVerification();
  assert.equal(out.source, 'midnight-indexer');
  assert.equal(out.contractAddress, CohortDapp.claims.contractAddress);
  assert.equal(out.proven >= 1, true, JSON.stringify(out));
  assert.equal(out.spentCount >= 1, true);
  assert.equal(Object.hasOwn(out, 'age'), false);
});
