import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { CohortDapp } from '../packages/dapp/src/index.mjs';
import { readDeployedVerifierKey } from '../packages/dapp/src/public-state.mjs';
import { zkArtifactPaths } from '../packages/dapp/src/zk-fs.mjs';

test('Preprod indexer queryContractState + ledger() returns proven >= 2', async () => {
  const out = await CohortDapp.getPublicVerification();
  assert.equal(out.source, 'midnight-indexer');
  assert.equal(out.contractAddress, CohortDapp.claims.contractAddress);
  assert.equal(out.proven >= 2, true, JSON.stringify(out));
  assert.equal(out.spentCount >= 2, true, JSON.stringify(out));
  assert.equal(Object.hasOwn(out, 'age'), false);
});

test('on-chain proveEligible verifier matches repo keys and live Render /zk', async () => {
  const local = fs.readFileSync(zkArtifactPaths().verifier);
  const deployed = await readDeployedVerifierKey();
  const onchain = Buffer.from(deployed.verifierKey);
  assert.equal(deployed.circuitId, 'proveEligible');
  assert.equal(onchain.equals(local), true);
  const live = Buffer.from(
    await (await fetch('https://cohort-y4zr.onrender.com/zk/keys/proveEligible.verifier')).arrayBuffer(),
  );
  assert.equal(live.equals(local), true);
  assert.equal(local.subarray(0, 26).toString('utf8'), 'midnight:verifier-key[v6]:');
  assert.equal(
    crypto.createHash('sha256').update(local).digest('hex'),
    '5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1',
  );
});
