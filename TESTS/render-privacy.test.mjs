import test from 'node:test';
import assert from 'node:assert/strict';
import { findExactMarkers, findForbiddenKeys } from './inspect.mjs';

const ORIGIN = 'https://cohort-y4zr.onrender.com';
const PATIENT_AGES = [31, 52];

async function getOk(pathname, attempts = 5) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await fetch(`${ORIGIN}${pathname}`);
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

test('Render origin responses do not carry PATIENT_A/B ages or private keys', async () => {
  const paths = ['/health', '/api/config', '/api/trials', '/api/public-state', '/zk/compiler/contract-info.json'];
  for (const pathname of paths) {
    const res = await getOk(pathname);
    assert.equal(res.ok, true, pathname);
    const ct = res.headers.get('content-type') || '';
    assert.equal(ct.includes('text/html'), false, pathname);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const payload = json ?? { text };
    assert.equal(findForbiddenKeys(payload).length, 0, pathname);
    assert.equal(findExactMarkers(payload, PATIENT_AGES).length, 0, pathname);
    assert.equal(text.includes('age=31'), false);
  }

  const leaked = await fetch(`${ORIGIN}/api/referral`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ trialId: 'NCT07153614', age: 31, condition: true }),
  });
  assert.equal(leaked.status, 400);
  const body = await leaked.text();
  assert.equal(body.includes('31'), false);
  assert.equal(body.includes('true'), false);
});
