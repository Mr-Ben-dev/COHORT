import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';
import { findExactMarkers, findForbiddenKeys } from './inspect.mjs';

const PATIENT_A = { age: 31, condition: true, medication: false };
const PATIENT_B = { age: 52, condition: false, medication: true };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('browser-equivalent network sniff against local origin', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());

  const requests = [];
  const sniff = async (pathname, opts = {}) => {
    requests.push({
      method: opts.method || 'GET',
      url: String(new URL(pathname, url)),
      headers: opts.headers || {},
      body: opts.body ?? null,
    });
    return request(url, pathname, opts);
  };

  const html = await sniff('/');
  assert.equal(html.status, 200);
  const app = await sniff('/app.js');
  assert.equal(app.status, 200);
  const dapp = await sniff('/cohort-dapp.js');
  assert.equal(dapp.status, 200);
  await sniff('/api/trials');
  await sniff('/api/config');
  await sniff('/health');

  // Simulated gold path: private facts stay in local variables; only public POST is attempted.
  const publicPost = await sniff('/api/referral', {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: `${url}/` },
    body: { trialId: 'NCT07153614', commitment: 'dd'.repeat(32) },
  });
  assert.equal(publicPost.status, 201);

  const rejected = await sniff('/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', ...PATIENT_A, fhir: { birthDate: '1994-01-01' } },
  });
  assert.equal(rejected.status, 400);

  for (const rec of requests) {
    const keys = rec.body ? findForbiddenKeys(rec.body) : [];
    if (keys.length) {
      assert.equal(rec.method, 'POST');
      continue;
    }
    assert.equal(findExactMarkers(rec, [31, 52]).length, 0, JSON.stringify(rec));
    assert.equal(String(rec.url).includes('age='), false);
  }

  const appSrc = fs.readFileSync(path.join(root, 'apps/web/app.js'), 'utf8');
  assert.match(appSrc, /freshBlind/);
  assert.match(appSrc, /getProvingProvider/);
  assert.match(appSrc, /will not generate a fake transaction/);
  assert.match(appSrc, /CohortDapp\.proveEligibility/);
  assert.match(appSrc, /CohortDapp\.getPublicVerification/);
  assert.match(appSrc, /preferred\.api\.connect\(networkId\)/);
  assert.match(appSrc, /hintUsage/);
  assert.equal(appSrc.includes('preferred.api.enable()'), false);
});

test('error responses do not echo private facts or auth headers', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/referral', {
    method: 'POST',
    headers: { authorization: 'Bearer secret-test', cookie: 'session=abc' },
    body: { trialId: 'NCT07153614', age: 31, witness: { age: 31 } },
  });
  assert.equal(res.status, 400);
  assert.equal(res.text.includes('31'), false);
  assert.equal(res.text.includes('Bearer'), false);
  assert.equal(res.text.includes('session=abc'), false);
});
