import test from 'node:test';
import assert from 'node:assert/strict';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';

test('eligibility does not leak via status codes: private posts always 400, public posts 201', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const a = await request(url, '/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', age: 31, condition: true, medication: false },
  });
  const b = await request(url, '/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', age: 52, condition: false, medication: true },
  });
  assert.equal(a.status, 400);
  assert.equal(b.status, 400);
  assert.equal(a.text.length, b.text.length);

  const pubA = await request(url, '/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', txHash: '11'.repeat(32) },
  });
  const pubB = await request(url, '/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', txHash: '22'.repeat(32) },
  });
  assert.equal(pubA.status, 201);
  assert.equal(pubB.status, 201);
});
