import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';
import { findExactMarkers, findForbiddenKeys } from './inspect.mjs';
import { normalizePatientBundle } from '../TESTS/fixtures/normalize-fhir.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATIENT_A = { age: 31, condition: true, medication: false };
const PATIENT_B = { age: 52, condition: false, medication: true };

test('privacy differential: backend traffic never contains PATIENT_A/B facts', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());

  const captured = [];
  const record = async (pathname, opts) => {
    const rec = { method: opts?.method || 'GET', url: pathname, body: opts?.body || null };
    const res = await request(url, pathname, opts);
    rec.status = res.status;
    rec.response = res.json ?? res.text;
    rec.responseText = res.text;
    captured.push(rec);
    return res;
  };

  await record('/health');
  await record('/api/config');
  await record('/api/trials');
  await record('/api/public-state');
  await record('/api/referral', {
    method: 'POST',
    body: { trialId: 'NCT07153614', commitment: 'aa'.repeat(32), txHash: 'bb'.repeat(32) },
  });
  await record('/api/referral', { method: 'POST', body: { trialId: 'NCT07153614', ...PATIENT_A } });
  await record('/api/referral', { method: 'POST', body: { trialId: 'NCT07153614', ...PATIENT_B } });
  await record('/?age=31');

  for (const rec of captured) {
    if (rec.method === 'POST' && rec.body && ('age' in rec.body || 'condition' in rec.body)) {
      assert.equal(rec.status, 400);
    }
    const payload = rec.response;
    const markers = findExactMarkers(payload, [31, 52, PATIENT_A.age, PATIENT_B.age]);
    const keys = findForbiddenKeys(payload);
    assert.equal(keys.length, 0, JSON.stringify({ rec, keys }));
    assert.equal(markers.length, 0, JSON.stringify({ rec, markers }));
    // Public hex (contract address) can contain the digits 31/52 as substrings.
    // Patient ages must appear as JSON numbers/strings via findExactMarkers, not as hex noise.
  }
});

test('frontend source does not POST private keys', () => {
  const src = fs.readFileSync(path.join(root, 'apps/web/app.js'), 'utf8');
  assert.match(src, /fetch\('\/api\/trials'\)/);
  assert.match(src, /fetch\('\/api\/config'\)/);
  assert.equal(/fetch\([^)]*age/.test(src), false);
  assert.equal(src.includes('localStorage'), false);
  assert.equal(src.includes('sessionStorage'), false);
  assert.equal(src.includes('indexedDB'), false);
});

test('FHIR fixture stays local — normalize does not HTTP', () => {
  const bundle = JSON.parse(fs.readFileSync(path.join(root, 'TESTS/fixtures/patient-001.json'), 'utf8'));
  const facts = normalizePatientBundle(bundle);
  assert.equal(typeof facts.ageYears, 'number');
  const src = fs.readFileSync(path.join(root, 'TESTS/fixtures/normalize-fhir.mjs'), 'utf8');
  assert.equal(src.includes('fetch('), false);
  assert.equal(src.includes('http.request'), false);
});

test('production static assets do not embed token prefixes', () => {
  for (const rel of ['apps/web/app.js', 'apps/web/index.html', 'apps/api/src/server.mjs', 'apps/web/cohort-dapp.js']) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const needle of ['ghp_', 'github_pat_', 'rnd_', 'vcp_', 'VITE_GITHUB', 'VITE_RENDER', 'VITE_VERCEL']) {
      assert.equal(src.includes(needle), false, `${rel} ${needle}`);
    }
  }
});
