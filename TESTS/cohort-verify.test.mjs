import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchVerifyState,
  classifyProvenance,
  SAMPLE_COUNTERS,
  PROVENANCE_LIVE,
  PROVENANCE_SAMPLE,
} from '../web/src/lib/cohort-verify.mjs';

const LIVE_BODY = (overrides = {}) => ({
  source: 'live-onchain',
  networkId: 'preprod',
  contractAddress: '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc',
  ...overrides,
});

/** Stub fetchImpl keyed on path -> { body, status }. */
function stubFetch(routes) {
  return async (path) => {
    if (!Object.hasOwn(routes, path)) {
      throw new Error(`unexpected path ${path}`);
    }
    const route = routes[path];
    if (route instanceof Error) throw route;
    const { body, status = 200 } = route;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
}

// ── classifyProvenance ─────────────────────────────────────────────────────

test('classifyProvenance: only the exact live source string is live', () => {
  assert.equal(classifyProvenance('live-onchain'), PROVENANCE_LIVE);
  for (const s of ['no-token-configured', 'blockfrost-preprod', 'unavailable', '', null, undefined, 42]) {
    assert.equal(classifyProvenance(s), PROVENANCE_SAMPLE, JSON.stringify(s));
  }
});

test('SAMPLE_COUNTERS is frozen and marked as sample data', () => {
  assert.equal(Object.isFrozen(SAMPLE_COUNTERS), true);
  assert.equal(SAMPLE_COUNTERS.sampleData, true);
});

// ── live → live badge ──────────────────────────────────────────────────────

test('live source on both endpoints -> provenance live-onchain with real counters', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': {
      body: LIVE_BODY({ proven: 12, referralCount: 5, spentCount: 3 }),
    },
    '/api/attestation-counters': {
      body: LIVE_BODY({ attestationCount: 9, attestationsVerified: 7 }),
    },
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'live-onchain');
  assert.equal(r.live, true);
  assert.equal(r.isSample, false);
  assert.equal(r.sample, null);
  assert.equal(r.error, null);
  assert.deepEqual(r.counters, {
    proven: 12,
    attestationCount: 9,
    attestationsVerified: 7,
    referralCount: 5,
  });
  assert.ok(Date.parse(r.fetchedAt) > 0);
});

test('live: alt counter key spellings are accepted', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': { body: LIVE_BODY({ proven: '12', referralCount: 5 }) },
    '/api/attestation-counters': {
      body: LIVE_BODY({ attestations: 9, verifiedCount: '7' }),
    },
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'live-onchain');
  assert.deepEqual(r.counters, {
    proven: 12,
    attestationCount: 9,
    attestationsVerified: 7,
    referralCount: 5,
  });
});

// ── no-token → sample badge ────────────────────────────────────────────────

test('source no-token-configured -> provenance sample-data with sample numbers and a reason', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': {
      body: {
        source: 'no-token-configured',
        reason: 'indexer token not configured',
        contractAddress: 'abc',
        proven: null,
      },
    },
    '/api/attestation-counters': { body: { source: 'no-token-configured' } },
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'sample-data');
  assert.equal(r.live, false);
  assert.equal(r.isSample, true);
  assert.equal(r.counters, null);
  assert.ok(r.sample, 'sample counters must be present for layout');
  assert.equal(r.sample.sampleData, true);
  assert.equal(r.sample.proven, SAMPLE_COUNTERS.proven);
  assert.match(r.error || '', /no-token-configured/);
  assert.match(r.error || '', /sample/i);
});

// ── fetch failure → sample badge with error text ───────────────────────────

test('network failure -> sample-data with error text naming the endpoint', async () => {
  const fetchImpl = async (path) => {
    throw new Error(`fetch failed for ${path}`);
  };
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'sample-data');
  assert.equal(r.counters, null);
  assert.ok(r.sample);
  assert.match(r.error || '', /\/api\/public-state/);
});

test('attestation-counters HTTP 404 -> sample-data mentioning the status', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': {
      body: LIVE_BODY({ proven: 12, referralCount: 5 }),
    },
    '/api/attestation-counters': { body: { error: 'not found' }, status: 404 },
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'sample-data');
  assert.match(r.error || '', /attestation-counters/);
  assert.match(r.error || '', /404/);
});

// ── no silent mock merge ───────────────────────────────────────────────────

test('no silent merge: live public-state + failed attestation-counters demotes everything to sample', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': {
      body: LIVE_BODY({ proven: 12, referralCount: 5 }),
    },
    '/api/attestation-counters': new Error('connection refused'),
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'sample-data');
  assert.equal(r.live, false);
  assert.equal(r.counters, null, 'live counters must NOT be shown when any endpoint failed');
  assert.ok(r.sample, 'must show clearly-labeled sample numbers instead');
  assert.equal(r.sample.sampleData, true);
  assert.match(r.error || '', /attestation-counters/);
});

test('live source but non-numeric counter -> sample-data with an explicit error, not NaN', async () => {
  const fetchImpl = stubFetch({
    '/api/public-state': { body: LIVE_BODY({ proven: 'twelve', referralCount: 5 }) },
    '/api/attestation-counters': {
      body: LIVE_BODY({ attestationCount: 9, attestationsVerified: 7 }),
    },
  });
  const r = await fetchVerifyState({ fetchImpl });
  assert.equal(r.provenance, 'sample-data');
  assert.equal(r.counters, null);
  assert.match(r.error || '', /not a number/);
});

test('missing fetch implementation -> sample-data with error', async () => {
  const r = await fetchVerifyState({ fetchImpl: null });
  assert.equal(r.provenance, 'sample-data');
  assert.ok(r.error);
});
