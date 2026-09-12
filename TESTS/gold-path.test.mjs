import test from 'node:test';
import assert from 'node:assert/strict';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';
import { CohortDapp, ErrorCode } from '../packages/dapp/src/index.mjs';
import { proveEligibility, bindOfficialTrial } from '../packages/dapp/src/prove.mjs';
import { zkArtifactPaths } from '../packages/dapp/src/zk-fs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TRIAL = {
  trialId: 'NCT07153614',
  minAge: 18,
  maxAge: 80,
  requireCondition: true,
  forbidMedication: true,
};

test('bindOfficialTrial rejects user-typed bounds that disagree with /api/trials', async () => {
  await assert.rejects(
    () => bindOfficialTrial({ trial: { ...TRIAL, minAge: 0 } }),
    (err) => err.code === ErrorCode.UNSUPPORTED_CRITERIA,
  );
  const official = await bindOfficialTrial({ trial: TRIAL });
  assert.equal(official.minAge, 18);
  assert.equal(official.maxAge, 80);
});

test('zero DUST fails closed with no invented txHash', async () => {
  const wallet = {
    dust: { balance: 0n, cap: 0n },
    api: {
      getProvingProvider: async () => ({}),
      getDustBalance: async () => ({ balance: 0n, cap: 0n }),
    },
  };
  await assert.rejects(
    () => proveEligibility({ wallet, trial: TRIAL, facts: { age: 31, condition: true, medication: false } }),
    (err) => {
      assert.equal(err.code, ErrorCode.INSUFFICIENT_DUST);
      assert.equal(err.txHash, undefined);
      return true;
    },
  );
});

test('local preview is labeled not-a-proof', async () => {
  const trials = await CohortDapp.getTrials();
  const trial = trials.find((t) => t.trialId === 'NCT07153614');
  const preview = CohortDapp.checkEligibility({ age: 31, condition: true, medication: false }, trial);
  assert.equal(preview.isProof, false);
  assert.equal(preview.kind, 'local-preview');
});

test('indexer verification is source of truth; /api/public-state is labeled cache', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  await request(url, '/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', txHash: 'ab'.repeat(32) },
  });
  const chain = await CohortDapp.getPublicVerification();
  const cache = await CohortDapp.getReferralState({ origin: url });
  const network = await CohortDapp.getNetworkState();
  assert.equal(chain.source, 'midnight-indexer');
  assert.equal(chain.proven >= 1, true);
  assert.equal(cache.notIndexerTruth, true);
  assert.equal(cache.source, 'cohort-memory-cache');
  assert.equal(cache.events[0].age, undefined);
  assert.equal(network.publicStateIsNotTruth, true);
  assert.equal(network.verification.source, 'midnight-indexer');
  assert.equal(Object.hasOwn(cache, 'proven'), false);
});

test('FetchZkConfigProvider loads proveEligible artifacts over HTTP without HTML fallback', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const zk = new FetchZkConfigProvider(`${url}/zk/`);
  const verifier = await zk.getVerifierKey('proveEligible');
  const zkir = await zk.getZKIR('proveEligible');
  const prover = await zk.getProverKey('proveEligible');
  assert.ok(verifier.byteLength > 32);
  assert.ok(zkir.byteLength > 16);
  assert.ok(prover.byteLength > 1_000_000);
  const onDisk = fs.readFileSync(zkArtifactPaths().verifier);
  assert.deepEqual(Buffer.from(verifier), onDisk);

  await assert.rejects(
    () => new FetchZkConfigProvider(`${url}/`).getVerifierKey('proveEligible'),
    /text\/html|Failed to fetch ZK artifact/,
  );
});

test('browser CohortDapp bundle is present and does not use unwrapV9', () => {
  const bundle = path.join(root, 'apps/web/cohort-dapp.js');
  assert.equal(fs.existsSync(bundle), true);
  const src = fs.readFileSync(bundle, 'utf8');
  assert.equal(/\bunwrapV9\s*\(/.test(src), false);
  assert.match(src, /proveEligible/);
});
