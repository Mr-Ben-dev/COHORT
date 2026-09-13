import test from 'node:test';
import assert from 'node:assert/strict';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';

const PRIVATE_BODIES = [
  { trialId: 'NCT07153614', age: 31 },
  { trialId: 'NCT07153614', diagnosis: 'E11.9' },
  { trialId: 'NCT07153614', medication: true },
  { trialId: 'NCT07153614', fhir: { resourceType: 'Patient' } },
  { trialId: 'NCT07153614', witness: { age: 31 } },
  { trialId: 'NCT07153614', privateState: { age: 31 } },
  { trialId: 'NCT07153614', secret: '00'.repeat(32) },
  { trialId: 'NCT07153614', blind: 'aa'.repeat(32) },
  { trialId: 'NCT07153614', patient: { age: 31 } },
  { trialId: 'NCT07153614', profile: { age: 31, condition: true } },
  { trialId: 'NCT07153614', seed: 'abandon abandon' },
  { trialId: 'NCT07153614', mnemonic: 'abandon abandon' },
];

const PRIVATE_KEYS = [
  'age',
  'condition',
  'medication',
  'fhir',
  'patient',
  'profile',
  'witness',
  'blind',
  'secret',
  'seed',
  'mnemonic',
  'privateState',
];

const PUBLIC_PATHS = [
  '/health',
  '/api/config',
  '/api/trials',
  '/api/public-state',
];

test('backend rejects private witness fields with 400', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  for (const body of PRIVATE_BODIES) {
    const res = await request(url, '/api/referral', { method: 'POST', body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.json?.error, 'private fields are not accepted');
    assert.equal(String(res.text).includes('31'), false);
  }
});

test('backend accepts public referral metadata only', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/referral', {
    method: 'POST',
    body: {
      trialId: 'NCT07153614',
      commitment: 'aa'.repeat(32),
      txHash: 'bb'.repeat(32),
      contractAddress: 'cc'.repeat(32),
      networkId: 'preprod',
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.event.trialId, 'NCT07153614');
  assert.equal(res.json.event.age, undefined);
});

test('query params cannot carry private fields', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/trials?age=31');
  assert.equal(res.status, 400);
});

test('every public endpoint rejects private keys without echoing them', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  for (const key of PRIVATE_KEYS) {
    const query = `?${key}=31`;
    for (const pathname of PUBLIC_PATHS) {
      const res = await request(url, `${pathname}${query}`);
      assert.ok(res.status === 400 || res.status === 404, `${pathname}${query} -> ${res.status}`);
      assert.equal(String(res.text).includes('31'), false, `${pathname}${query} echoed`);
    }
    const postReferral = await request(url, '/api/referral', {
      method: 'POST',
      body: { trialId: 'NCT07153614', [key]: 31 },
    });
    assert.equal(postReferral.status, 400, `POST /api/referral ${key}`);
    assert.equal(String(postReferral.text).includes('31'), false, `POST /api/referral ${key} echoed`);
    const postTrials = await request(url, '/api/trials', {
      method: 'POST',
      body: { trialId: 'NCT07153614', [key]: 31 },
    });
    assert.ok(
      postTrials.status === 400 || postTrials.status === 404 || postTrials.status === 405,
      `POST /api/trials ${key} -> ${postTrials.status}`,
    );
    assert.equal(String(postTrials.text).includes('31'), false, `POST /api/trials ${key} echoed`);
  }
});
