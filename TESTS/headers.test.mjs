import test from 'node:test';
import assert from 'node:assert/strict';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';

test('security headers present on health and HTML', async (t) => {
  process.env.NODE_ENV = 'production';
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const health = await request(url, '/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.status, 'ok');
  assert.equal(Object.keys(health.json).join(','), 'status');
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.equal(health.headers['referrer-policy'], 'no-referrer');
  assert.match(health.headers['content-security-policy'] || '', /frame-ancestors 'none'/);
  assert.match(health.headers['content-security-policy'] || '', /wasm-unsafe-eval/);
  assert.ok(health.headers['strict-transport-security']);

  const html = await request(url, '/');
  assert.equal(html.headers['x-frame-options'], 'DENY');
  assert.equal(html.headers['cache-control'], 'no-store');
});

test('CORS allows configured origin and rejects others', async (t) => {
  process.env.CORS_ORIGIN = 'https://cohort.example';
  process.env.PUBLIC_APP_URL = 'https://cohort.example';
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const ok = await request(url, '/health', { headers: { origin: 'https://cohort.example' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['access-control-allow-origin'], 'https://cohort.example');
  const bad = await request(url, '/health', { headers: { origin: 'https://evil.example' } });
  assert.equal(bad.status, 403);
});

test('multi-user public events do not mix private facts', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  await Promise.all([
    request(url, '/api/referral', { method: 'POST', body: { trialId: 'NCT07153614', txHash: 'a'.repeat(64) } }),
    request(url, '/api/referral', { method: 'POST', body: { trialId: 'NCT04200963', txHash: 'b'.repeat(64) } }),
    request(url, '/api/referral', { method: 'POST', body: { trialId: 'NCT07153614', txHash: 'c'.repeat(64) } }),
  ]);
  const state = await request(url, '/api/public-state');
  assert.equal(state.json.events.length, 3);
  for (const ev of state.json.events) {
    assert.equal(ev.age, undefined);
    assert.equal(ev.witness, undefined);
    assert.ok(['NCT07153614', 'NCT04200963'].includes(ev.trialId));
  }
});
