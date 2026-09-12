import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPrivateFields } from '../apps/api/src/public-fields.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('designer store keeps inputs in memory and never writes localStorage', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  assert.equal(src.includes('localStorage'), false);
  assert.equal(src.includes('sessionStorage'), false);
  assert.equal(src.includes('indexedDB'), false);
  assert.match(src, /factsFromInput/);
});

test('proof service does not POST facts to COHORT origin', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/services/proof.ts'), 'utf8');
  assert.match(src, /proveEligibility/);
  assert.equal(/fetch\([^)]*facts/.test(src), false);
  assert.match(src, /COHORT_API_ORIGIN/);
});

test('Render still fail-closes designer-shaped private POSTs', async () => {
  const res = await fetch('https://cohort-y4zr.onrender.com/api/referral', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ age: 31, condition: true, medication: false, trialId: 'NCT07153614' }),
  });
  assert.equal(res.status, 400);
  const text = await res.text();
  assert.equal(text.includes('31'), false);
  assert.equal(findPrivateFields({ age: 31, condition: true }).includes('age'), true);
});
