/**
 * TESTS/catalog-pg.test.mjs — Render Postgres catalog read layer (SQUAD D, D6).
 *
 * Covers, with NO live Postgres and NO network (mocked pg driver):
 *   1. migrate() idempotency: asserts the real db/schema.sql contains
 *      IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING, and that running
 *      migrate() twice issues the same SQL without error.
 *   2. hash determinism: catalog-pg.mjs re-exports catalog-db.mjs's
 *      canonicalization (reference equality) and hashes are order-independent.
 *   3. secret hygiene: no DATABASE_URL value is ever logged or thrown.
 *   4. --use-db / CATALOG_SOURCE source resolution, isDbConfigured, and the
 *      graceful labeled fallback to the in-code catalog.
 *   5. DB row -> public-trial mapping via a mocked pg Pool.
 *
 * NOT live-tested against Render Postgres (environment SSL limitation:
 * this VM cannot complete the Postgres SSL handshake). First live run
 * happens on Render (migrate() on API boot + sync-catalog-pg.mjs one-off job).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATALOG_SOURCES,
  resolveCatalogSource,
  isDbConfigured,
  stableStringify,
  canonicalCatalogHash,
  projectSnapshotRow,
  codeSnapshotRows,
  publicTrialFromDbRow,
  getTrials,
  getTrial,
  getCatalogVersion,
  migrate,
  getPool,
  closePool,
  _resetPoolCache,
} from '../apps/api/src/catalog-pg.mjs';
import {
  canonicalCatalogHash as dbCanonicalCatalogHash,
  projectSnapshotRow as dbProjectSnapshotRow,
  stableStringify as dbStableStringify,
} from '../apps/api/src/catalog-db.mjs';

// Fixture-backed code catalog (apps/api/src/trials.mjs reads TESTS/fixtures).
const savedNodeTestContext = process.env.NODE_TEST_CONTEXT;
process.env.NODE_TEST_CONTEXT = '1';
test.after(() => {
  if (savedNodeTestContext === undefined) delete process.env.NODE_TEST_CONTEXT;
  else process.env.NODE_TEST_CONTEXT = savedNodeTestContext;
});

// Fake env values chosen to NOT match TESTS/secrets.test.mjs token patterns.
const FAKE_URL = 'postgres://fake-user:fake-pass-0000@fake-host.example:5432/fake_db';
const FAKE_PASS = 'fake-pass-0000';
const fakeConfiguredEnv = () => ({ DATABASE_URL: FAKE_URL });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');

// ---------------------------------------------------------------------------
// Mock pg driver: { Pool } with canned query routing + captured queries.
// ---------------------------------------------------------------------------

function mockPgModule({ trials = [], predicates = [], sites = [], failQuery = null, failPool = null } = {}) {
  const seen = [];
  class MockPool {
    constructor(config) {
      if (failPool) throw failPool;
      this.config = config;
    }
    async query(text, params) {
      seen.push({ text, params });
      if (failQuery) throw failQuery;
      if (/eligibility_predicates/i.test(text)) return { rows: predicates };
      if (/trial_sites/i.test(text)) return { rows: sites };
      if (/\bfrom trials\b/i.test(text) && !/insert/i.test(text)) return { rows: trials };
      return { rows: [] }; // schema script + writes
    }
    async end() {
      this.ended = true;
    }
  }
  return { pg: { Pool: MockPool }, seen };
}

test.beforeEach(() => {
  _resetPoolCache();
});
test.afterEach(async () => {
  await closePool();
  _resetPoolCache();
});

// ---------------------------------------------------------------------------
// 1. migrate() idempotency
// ---------------------------------------------------------------------------

test('db/schema.sql is fully idempotent (IF NOT EXISTS / OR REPLACE / DO NOTHING)', () => {
  const creates = schemaSql.match(/create\s+(?:table|index)\s+(if\s+not\s+exists\s+)?/gi) ?? [];
  assert.ok(creates.length >= 4, `expected >=4 CREATE TABLE/INDEX statements, got ${creates.length}`);
  for (const c of creates) {
    assert.match(c, /if\s+not\s+exists/i, `missing IF NOT EXISTS: ${c}`);
  }
  assert.match(schemaSql, /create\s+or\s+replace\s+function/i, 'updated_at function must be CREATE OR REPLACE');
  assert.match(schemaSql, /drop\s+trigger\s+if\s+exists/i, 'trigger must be DROP IF EXISTS before CREATE');
  assert.match(schemaSql, /on\s+conflict\s*\(\s*id\s*\)\s+do\s+nothing/i, 'sync_state seed must be ON CONFLICT DO NOTHING');
});

test('migrate() runs the real schema SQL twice without error (idempotent)', async () => {
  const mock = mockPgModule();
  const r1 = await migrate({ env: fakeConfiguredEnv(), pgModule: mock.pg });
  const r2 = await migrate({ env: fakeConfiguredEnv(), pgModule: mock.pg });
  assert.deepEqual(r1, { ok: true });
  assert.deepEqual(r2, { ok: true });
  assert.equal(mock.seen.length, 2, 'expected exactly one query per migrate() call');
  assert.equal(mock.seen[0].text, schemaSql, 'migrate() must execute the real db/schema.sql');
  assert.equal(mock.seen[1].text, schemaSql, 'second migrate() must issue identical SQL');
  assert.equal(mock.seen[0].text.includes(FAKE_PASS), false, 'schema SQL must not contain DATABASE_URL');
});

test('migrate() names DATABASE_URL when unset (never its value)', async () => {
  await assert.rejects(
    () => migrate({ env: {}, pgModule: mockPgModule().pg }),
    (err) => {
      assert.match(err.message, /DATABASE_URL is not set/);
      assert.equal(err.message.includes(FAKE_PASS), false);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// 2. hash determinism — identical canonicalization to catalog-db.mjs
// ---------------------------------------------------------------------------

test('catalog-pg re-exports catalog-db canonicalization (same function refs)', () => {
  assert.equal(canonicalCatalogHash, dbCanonicalCatalogHash);
  assert.equal(projectSnapshotRow, dbProjectSnapshotRow);
  assert.equal(stableStringify, dbStableStringify);
});

test('catalog-version hash is order-independent and content-sensitive', () => {
  const rowA = { nct_id: 'NCT2', title: 'B', status: 'RECRUITING', phases: ['PHASE2', 'PHASE1'], conditions: ['Z', 'A'], sponsor: 'S', predicates: [] };
  const rowB = { nct_id: 'NCT1', title: 'A', status: 'RECRUITING', phases: [], conditions: [], sponsor: null, predicates: [] };
  const snap1 = [projectSnapshotRow(rowA), projectSnapshotRow(rowB)];
  // Reversed row order + shuffled object keys + unsorted arrays -> same hash.
  const rowA2 = { predicates: [], sponsor: 'S', conditions: ['A', 'Z'], phases: ['PHASE1', 'PHASE2'], status: 'RECRUITING', title: 'B', nct_id: 'NCT2' };
  const snap2 = [projectSnapshotRow(rowB), projectSnapshotRow(rowA2)];
  assert.equal(canonicalCatalogHash(snap1), canonicalCatalogHash(snap2));
  const mutated = snap1.map((r) => (r.nct_id === 'NCT1' ? { ...r, title: 'CHANGED' } : r));
  assert.notEqual(canonicalCatalogHash(snap1), canonicalCatalogHash(mutated));
});

test('pg snapshot path hashes identically to the code-catalog path', async () => {
  // One trial with zero predicates: pg SELECT rows are plain objects, same as
  // projectSnapshotRow input in the sync script.
  const trialRow = { nct_id: 'NCT1', title: 'A', status: 'RECRUITING', phases: [], conditions: [], sponsor: null };
  const mock = mockPgModule({ trials: [trialRow], predicates: [], sites: [] });
  const version = await getCatalogVersion({ source: 'db', env: fakeConfiguredEnv(), pgModule: mock.pg });
  const expected = dbCanonicalCatalogHash([dbProjectSnapshotRow(trialRow, [])]);
  assert.equal(version, expected);
  assert.match(version, /^[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------
// 3. secret hygiene: DATABASE_URL value never logged or thrown
// ---------------------------------------------------------------------------

test('secret hygiene: failures name DATABASE_URL, never its value', async () => {
  const logged = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => logged.push(a.join(' '));
  console.error = (...a) => logged.push(a.join(' '));
  try {
    // Pool constructor failure on the db read path.
    const badPool = mockPgModule({ failPool: new Error('mock connection refused') });
    await assert.rejects(
      () => getTrials({ source: 'db', env: fakeConfiguredEnv(), pgModule: badPool.pg }),
      (err) => {
        assert.match(err.message, /mock connection refused/);
        assert.equal(err.message.includes(FAKE_PASS), false, 'pool error must not leak DATABASE_URL');
        return true;
      },
    );
    // Query failure on the version path: message is labeled, value not included.
    const badQuery = mockPgModule({ failQuery: new Error('mock query failed') });
    await assert.rejects(
      () => getCatalogVersion({ source: 'db', env: fakeConfiguredEnv(), pgModule: badQuery.pg }),
      (err) => {
        assert.equal(err.message, 'postgres catalog unavailable');
        assert.equal(err.status, 503);
        assert.equal(String(err.message).includes(FAKE_PASS), false);
        return true;
      },
    );
    // Successful migrate: nothing sensitive logged. Reset the pool cache
    // first — block 2 above cached the failing pool by design.
    _resetPoolCache();
    const okMock = mockPgModule();
    await migrate({ env: fakeConfiguredEnv(), pgModule: okMock.pg });
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
  for (const line of logged) {
    assert.equal(line.includes(FAKE_PASS), false, `log line leaked DATABASE_URL value: ${line}`);
  }
});

test('getPool connects lazily and closePool tears down', async () => {
  const mock = mockPgModule();
  const pool = await getPool({ env: fakeConfiguredEnv(), pgModule: mock.pg });
  assert.equal(pool.config.connectionString, FAKE_URL, 'pool must receive DATABASE_URL (driver-internal)');
  assert.deepEqual(pool.config.ssl, { rejectUnauthorized: true }, 'Render Postgres requires TLS');
  await closePool();
  assert.equal(pool.ended, true);
});

// ---------------------------------------------------------------------------
// 4. source resolution + graceful labeled fallback
// ---------------------------------------------------------------------------

test('resolveCatalogSource: code default, --use-db / CATALOG_SOURCE=db opt in', () => {
  assert.equal(resolveCatalogSource({ env: {} }), CATALOG_SOURCES.code);
  assert.equal(resolveCatalogSource({ argv: ['--use-db'], env: {} }), CATALOG_SOURCES.db);
  assert.equal(resolveCatalogSource({ env: { CATALOG_SOURCE: 'db' } }), CATALOG_SOURCES.db);
  assert.equal(resolveCatalogSource({ env: { CATALOG_SOURCE: 'DB' } }), CATALOG_SOURCES.db);
  assert.equal(resolveCatalogSource({ env: { CATALOG_SOURCE: 'code' } }), CATALOG_SOURCES.code);
});

test('isDbConfigured reflects DATABASE_URL only', () => {
  assert.equal(isDbConfigured({ DATABASE_URL: FAKE_URL }), true);
  assert.equal(isDbConfigured({}), false);
  assert.equal(isDbConfigured({ SUPABASE_URL: 'x', SUPABASE_ANON_KEY: 'y' }), false);
});

test('db requested but DATABASE_URL unset -> labeled in-code fallback', async () => {
  const trials = await getTrials({ source: 'db', env: {} });
  assert.ok(trials.length > 0, 'fallback must still serve trials');
  for (const t of trials) {
    assert.equal(t.catalogSource, 'code (db requested; DATABASE_URL unset)');
  }
  const one = await getTrial(trials[0].trialId, { source: 'db', env: {} });
  assert.equal(one.catalogSource, 'code (db requested; DATABASE_URL unset)');
  const missing = await getTrial('NCT00000000', { source: 'db', env: {} });
  assert.equal(missing, null);
});

test('codeSnapshotRows version is deterministic', () => {
  assert.equal(canonicalCatalogHash(codeSnapshotRows()), canonicalCatalogHash(codeSnapshotRows()));
});

// ---------------------------------------------------------------------------
// 5. mocked-pg DB read mapping
// ---------------------------------------------------------------------------

test('getTrials maps mocked pg rows onto the public-trial shape', async () => {
  const mock = mockPgModule({
    trials: [
      {
        nct_id: 'NCT9',
        title: 'Mock Trial',
        status: 'RECRUITING',
        phases: ['PHASE2'],
        conditions: ['Condition X'],
        sponsor: 'Mock Sponsor',
      },
    ],
    predicates: [
      {
        nct_id: 'NCT9',
        predicate_type: 'age_range',
        operator: 'between',
        value: { min: 18, max: 65, unit: 'years' },
        unit: null,
        source_text: 'Ages 18-65',
        confidence: 'hand-mapped',
        mapped_by: 'hand:test',
      },
    ],
    sites: [{ nct_id: 'NCT9', facility: 'Site A', city: 'Cairo', country: 'Egypt', status: 'RECRUITING' }],
  });
  const trials = await getTrials({ source: 'db', env: fakeConfiguredEnv(), pgModule: mock.pg });
  assert.equal(trials.length, 1);
  const t = trials[0];
  assert.equal(t.trialId, 'NCT9');
  assert.equal(t.catalogSource, 'db');
  assert.equal(t.fetchedFrom, 'render-postgres-catalog');
  assert.equal(t.minAge, 18);
  assert.equal(t.maxAge, 65);
  assert.deepEqual(t.sites, [{ facility: 'Site A', city: 'Cairo', country: 'Egypt', status: 'RECRUITING' }]);
  assert.equal(t.predicates.length, 1);
  assert.equal(t.predicates[0].predicateType, 'age_range');
});

test('getTrial returns null for unknown NCT id on the db path', async () => {
  const mock = mockPgModule({ trials: [], predicates: [], sites: [] });
  const t = await getTrial('NCT00000000', { source: 'db', env: fakeConfiguredEnv(), pgModule: mock.pg });
  assert.equal(t, null);
});

test('publicTrialFromDbRow is the shared canonical mapping', () => {
  assert.equal(typeof publicTrialFromDbRow, 'function');
});
