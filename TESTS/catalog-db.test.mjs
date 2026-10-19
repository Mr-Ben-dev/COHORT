/**
 * TESTS/catalog-db.test.mjs — Supabase catalog read layer (SQUAD D, D5).
 *
 * Covers, with NO live Supabase and NO network:
 *   1. graceful fallback to the in-code catalog when SUPABASE_* env is absent
 *   2. catalog-version hash determinism (same input -> same hash)
 *   3. secret hygiene: no SUPABASE_* value is ever logged or thrown
 *   4. --use-db / CATALOG_SOURCE source resolution
 *   5. DB row -> public-trial mapping via a stubbed REST fetch
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOG_SOURCES,
  resolveCatalogSource,
  isDbConfigured,
  stableStringify,
  canonicalCatalogHash,
  codeSnapshotRows,
  projectSnapshotRow,
  publicTrialFromDbRow,
  getTrials,
  getTrial,
  getCatalogVersion,
} from '../apps/api/src/catalog-db.mjs';
import { TRIAL_MAPPINGS } from '../apps/api/src/trials.mjs';

// Fixture-backed code catalog (apps/api/src/trials.mjs reads TESTS/fixtures).
const savedNodeTestContext = process.env.NODE_TEST_CONTEXT;
process.env.NODE_TEST_CONTEXT = '1';
test.after(() => {
  if (savedNodeTestContext === undefined) delete process.env.NODE_TEST_CONTEXT;
  else process.env.NODE_TEST_CONTEXT = savedNodeTestContext;
});

// Fake env values chosen to NOT match TESTS/secrets.test.mjs token patterns.
const FAKE_URL = 'https://fake-test-host.supabase.co';
const FAKE_ANON = 'fake-test-anon-key-0000';
const fakeConfiguredEnv = () => ({ SUPABASE_URL: FAKE_URL, SUPABASE_ANON_KEY: FAKE_ANON });

// ---------------------------------------------------------------------------
// 1. source resolution
// ---------------------------------------------------------------------------

test('resolveCatalogSource defaults to code', () => {
  assert.equal(resolveCatalogSource({ argv: [], env: {} }), CATALOG_SOURCES.code);
});

test('resolveCatalogSource honors --use-db and CATALOG_SOURCE=db', () => {
  assert.equal(resolveCatalogSource({ argv: ['--use-db'], env: {} }), CATALOG_SOURCES.db);
  assert.equal(resolveCatalogSource({ argv: [], env: { CATALOG_SOURCE: 'db' } }), CATALOG_SOURCES.db);
  assert.equal(resolveCatalogSource({ argv: [], env: { CATALOG_SOURCE: 'DB' } }), CATALOG_SOURCES.db);
});

test('resolveCatalogSource treats unknown CATALOG_SOURCE as code', () => {
  assert.equal(resolveCatalogSource({ argv: [], env: { CATALOG_SOURCE: 'postgres' } }), CATALOG_SOURCES.code);
});

test('isDbConfigured requires both SUPABASE_URL and SUPABASE_ANON_KEY', () => {
  assert.equal(isDbConfigured({}), false);
  assert.equal(isDbConfigured({ SUPABASE_URL: FAKE_URL }), false);
  assert.equal(isDbConfigured({ SUPABASE_ANON_KEY: FAKE_ANON }), false);
  assert.equal(isDbConfigured(fakeConfiguredEnv()), true);
});

// ---------------------------------------------------------------------------
// 2. graceful fallback (no env -> in-code catalog, labeled)
// ---------------------------------------------------------------------------

test('getTrials() with no env falls back to the in-code catalog', async () => {
  const trials = await getTrials({ env: {} });
  const ids = Object.keys(TRIAL_MAPPINGS);
  assert.equal(trials.length, ids.length);
  assert.deepEqual(trials.map((t) => t.trialId).sort(), [...ids].sort());
  assert.equal(trials[0].fetchedFrom, 'test-fixture');
  assert.equal(trials[0].catalogSource, 'code');
});

test("getTrials({source:'db'}) with no env falls back gracefully and is labeled", async () => {
  const trials = await getTrials({ source: 'db', env: {} });
  assert.equal(trials.length, Object.keys(TRIAL_MAPPINGS).length);
  assert.match(trials[0].catalogSource, /db requested; SUPABASE_\* unset/);
});

test('getTrial falls back to code catalog; unknown id -> null', async () => {
  const trial = await getTrial('NCT07153614', { env: {} });
  assert.equal(trial.trialId, 'NCT07153614');
  assert.equal(trial.catalogSource, 'code');
  assert.equal(await getTrial('NCT00000000', { env: {} }), null);
});

// ---------------------------------------------------------------------------
// 3. version-hash determinism
// ---------------------------------------------------------------------------

test('canonicalCatalogHash is deterministic and order-independent', () => {
  const rows = codeSnapshotRows();
  const h1 = canonicalCatalogHash(rows);
  const h2 = canonicalCatalogHash(rows);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  // reversed row order -> same hash
  assert.equal(canonicalCatalogHash([...rows].reverse()), h1);
  // shuffled object keys -> same hash
  const shuffled = rows.map((r) => {
    const out = {};
    for (const k of Object.keys(r).reverse()) out[k] = r[k];
    return out;
  });
  assert.equal(canonicalCatalogHash(shuffled), h1);
  // different content -> different hash
  const altered = JSON.parse(JSON.stringify(rows));
  altered[0].predicates.push({
    predicate_type: 'age_range',
    operator: 'between',
    value: { min: 0, max: 1 },
    unit: 'years',
    source_text: 'poison',
    confidence: 'auto-draft',
  });
  assert.notEqual(canonicalCatalogHash(altered), h1);
});

test('stableStringify sorts keys recursively', () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }), stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
});

test('projectSnapshotRow excludes volatile timestamps from the hash input', () => {
  const trial = {
    nct_id: 'NCT1',
    title: 'T',
    status: 'RECRUITING',
    phases: ['PHASE2'],
    conditions: ['C'],
    sponsor: 'S',
    synced_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  };
  const row = projectSnapshotRow(trial, []);
  assert.equal('synced_at' in row, false);
  assert.equal('updated_at' in row, false);
  assert.equal(row.nct_id, 'NCT1');
});

test('getCatalogVersion() with no env hashes the code catalog deterministically', async () => {
  const expected = canonicalCatalogHash(codeSnapshotRows());
  assert.equal(await getCatalogVersion({ env: {} }), expected);
  assert.equal(await getCatalogVersion({ env: {} }), expected);
});

// ---------------------------------------------------------------------------
// 4. DB row -> public-trial mapping (stubbed REST, no network)
// ---------------------------------------------------------------------------

const stubTrials = [
  {
    nct_id: 'NCT99999999',
    title: 'Stubbed Test Trial',
    status: 'RECRUITING',
    phases: ['PHASE2'],
    conditions: ['Test Condition'],
    sponsor: 'Test Sponsor',
  },
];
const stubPredicates = [
  {
    nct_id: 'NCT99999999',
    predicate_type: 'age_range',
    operator: 'between',
    value: { min: 18, max: 65 },
    unit: 'years',
    source_text: 'Ages 18 to 65 years',
    confidence: 'hand-mapped',
    mapped_by: 'hand:test',
  },
  {
    nct_id: 'NCT99999999',
    predicate_type: 'condition_flag',
    operator: 'require',
    value: { required: true },
    unit: null,
    source_text: 'Histologically confirmed test condition',
    confidence: 'hand-mapped',
    mapped_by: 'hand:test',
  },
];
const stubSites = [
  {
    nct_id: 'NCT99999999',
    facility: 'Test Hospital',
    city: 'Cairo',
    country: 'Egypt',
    status: 'RECRUITING',
  },
];

function stubFetchImpl(url) {
  const u = String(url);
  let payload;
  if (u.includes('/rest/v1/trials?')) payload = stubTrials;
  else if (u.includes('/rest/v1/eligibility_predicates?')) payload = stubPredicates;
  else if (u.includes('/rest/v1/trial_sites?')) payload = stubSites;
  else throw new Error(`unexpected network call in test: ${u}`);
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
}

test('getTrials({source:db}) maps DB rows onto the public-trial shape', async () => {
  const trials = await getTrials({ source: 'db', env: fakeConfiguredEnv(), fetchImpl: stubFetchImpl });
  assert.equal(trials.length, 1);
  const t = trials[0];
  assert.equal(t.trialId, 'NCT99999999');
  assert.equal(t.minAge, 18);
  assert.equal(t.maxAge, 65);
  assert.equal(t.requireCondition, true);
  assert.equal(t.conditionLabel, 'Histologically confirmed test condition');
  assert.equal(t.predicates.length, 2);
  assert.equal(t.predicates[0].predicateType, 'age_range');
  assert.equal(t.predicates[0].sourceText, 'Ages 18 to 65 years');
  assert.equal(t.sites.length, 1);
  assert.equal(t.sites[0].city, 'Cairo');
  assert.equal(t.source, 'https://clinicaltrials.gov/study/NCT99999999');
  assert.equal(t.fetchedFrom, 'supabase-catalog');
  assert.equal(t.catalogSource, 'db');
});

test('getTrial({source:db}) returns null for unknown NCT id', async () => {
  assert.equal(
    await getTrial('NCT00000000', { source: 'db', env: fakeConfiguredEnv(), fetchImpl: stubFetchImpl }),
    null,
  );
});

test('getCatalogVersion({source:db}) hashes the stubbed snapshot deterministically', async () => {
  const v1 = await getCatalogVersion({ source: 'db', env: fakeConfiguredEnv(), fetchImpl: stubFetchImpl });
  const v2 = await getCatalogVersion({ source: 'db', env: fakeConfiguredEnv(), fetchImpl: stubFetchImpl });
  assert.equal(v1, v2);
  assert.match(v1, /^[0-9a-f]{64}$/);
  // and it differs from the code-catalog version (different content)
  assert.notEqual(v1, await getCatalogVersion({ env: {} }));
});

test('publicTrialFromDbRow tolerates trials with no predicates', () => {
  const t = publicTrialFromDbRow(stubTrials[0], [], []);
  assert.equal(t.minAge, null);
  assert.equal(t.requireCondition, false);
  assert.deepEqual(t.predicates, []);
  assert.equal(t.catalogSource, 'db');
});

// ---------------------------------------------------------------------------
// 5. secret hygiene: no SUPABASE_* value in logs or thrown errors
// ---------------------------------------------------------------------------

test('no secret-looking env value is ever logged or thrown', async () => {
  const captured = [];
  const methods = ['log', 'warn', 'error'];
  const originals = Object.fromEntries(methods.map((m) => [m, console[m]]));
  for (const m of methods) console[m] = (...args) => captured.push(args.map(String).join(' '));
  const env = fakeConfiguredEnv();
  try {
    await getTrials({ env }); // code path, no network
    await getTrial('NCT07153614', { env });
    await getCatalogVersion({ env });
    await getTrials({ source: 'db', env: {} }); // fallback path
    // DB path with a failing fetch: the thrown error must not carry secrets
    const boom = () => Promise.reject(new Error('boom-test-network'));
    await assert.rejects(() => getTrials({ source: 'db', env, fetchImpl: boom }), /supabase catalog unavailable/);
  } finally {
    for (const m of methods) console[m] = originals[m];
  }
  const all = captured.join('\n');
  assert.equal(all.includes(FAKE_URL), false, 'console output leaked SUPABASE_URL');
  assert.equal(all.includes(FAKE_ANON), false, 'console output leaked SUPABASE_ANON_KEY');
  try {
    await getTrials({ source: 'db', env, fetchImpl: () => Promise.reject(new Error('boom-test-network')) });
    assert.fail('expected rejection');
  } catch (err) {
    assert.equal(String(err.message).includes(FAKE_URL), false);
    assert.equal(String(err.message).includes(FAKE_ANON), false);
    assert.equal(String(err.cause ?? '').includes(FAKE_URL), false);
  }
});
