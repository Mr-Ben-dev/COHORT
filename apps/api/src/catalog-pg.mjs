/**
 * Render-Postgres-backed read layer for the COHORT public trial catalog.
 * (REPLACES the Supabase recommendation in catalog-db.mjs.)
 *
 * TRUST BOUNDARY (non-negotiable):
 *  - The database holds ONLY public trial metadata (already on
 *    ClinicalTrials.gov), hand-mapped eligibility predicates, and mapping
 *    provenance (raw criterion text). It NEVER holds patient attributes,
 *    circuit witnesses, salts, nullifier preimages, issuer keys, or user
 *    identities.
 *  - A DB compromise leaks the public catalog (already public). The risk is
 *    INTEGRITY (poisoned predicates), mitigated by the raw source_text audit
 *    trail on every predicate row and by getCatalogVersion(): a SHA-256 hash
 *    over the canonical catalog snapshot, served as a public input commitment
 *    for the ZK proof. (The circuit-side check is out of scope; this module
 *    provides the version-hash plumbing.)
 *
 * SOURCE SELECTION:
 *  - Default source is the in-code catalog (apps/api/src/trials.mjs): nothing
 *    changes for existing deployments.
 *  - Pass `--use-db` on the API command line or set CATALOG_SOURCE=db to read
 *    from the Render Postgres catalog via the `pg` driver.
 *  - If source=db is requested but DATABASE_URL is not set, the module falls
 *    back to the in-code catalog and labels the response accordingly
 *    (graceful, labeled — never a silent substitution).
 *
 * MIGRATION ON BOOT:
 *  - migrate() runs db/schema.sql (idempotent: CREATE TABLE IF NOT EXISTS)
 *    whenever DATABASE_URL is set. Call bootCatalog() once from the API
 *    entrypoint before serving.
 *
 * SECRET HYGIENE: this module never logs or throws env var VALUES. Error and
 * log strings name the variable (e.g. "DATABASE_URL is not set") but never
 * interpolate its value. Covered by TESTS/catalog-pg.test.mjs.
 *
 * CONNECTION: Render Postgres requires TLS. The pool is created with
 * ssl { rejectUnauthorized: true } (Render serves valid certs). This VM's
 * egress proxy cannot complete the Postgres SSL handshake, so this module
 * CANNOT be live-tested here — first live run happens on Render.
 *
 * SERVER.MJS WIRING (pending — apps/api/src/server.mjs is owned by SQUAD A,
 * do not edit concurrently; apply once A1/A7 clear it):
 *
 *   import { bootCatalog, resolveCatalogSource, getTrials, getTrial,
 *            getCatalogVersion } from './catalog-pg.mjs';
 *   const CATALOG = await bootCatalog({ argv: process.argv.slice(2) });
 *   // CATALOG.source is 'code' | 'db'; CATALOG.dbConfigured is boolean.
 *
 *   // in the '/api/trials' handler, replace `getPublicTrials()` with:
 *   const trials = await getTrials({ source: CATALOG.source });
 *   // in the '/api/trials/:id' handler, replace `getTrial(trialId)` with:
 *   const trial = await getTrial(trialId, { source: CATALOG.source });
 *   // knownTrialId() stays as-is for the code catalog allowlist; when
 *   // source=db the handler should 404 on `trial === null` instead.
 *   // Optional: expose GET /api/catalog-version -> { version, source } via
 *   // getCatalogVersion({ source: CATALOG.source }).
 */

import fs from 'node:fs';

import {
  getPublicTrials as getCodeTrials,
  getTrial as getCodeTrial,
} from './trials.mjs';
import {
  CATALOG_SOURCES,
  // Canonicalization is defined ONCE in catalog-db.mjs; re-exported here so
  // the pg track computes bit-identical version hashes. Determinism is
  // covered by TESTS/catalog-pg.test.mjs (reference equality + behavior).
  canonicalCatalogHash,
  projectSnapshotRow,
  stableStringify,
  codeSnapshotRows,
  publicTrialFromDbRow,
} from './catalog-db.mjs';

export {
  CATALOG_SOURCES,
  canonicalCatalogHash,
  projectSnapshotRow,
  stableStringify,
  codeSnapshotRows,
  publicTrialFromDbRow,
};

const SCHEMA_PATH = new URL('../../../db/schema.sql', import.meta.url);

const POOL_CONFIG = Object.freeze({
  connectionTimeoutMillis: 8000,
  max: 5,
});

/**
 * Resolve which catalog to serve. CLI flag wins over env; default is 'code'
 * so existing deployments are untouched.
 */
export function resolveCatalogSource({ argv = [], env = process.env } = {}) {
  if (Array.isArray(argv) && argv.includes('--use-db')) return CATALOG_SOURCES.db;
  const fromEnv = typeof env?.CATALOG_SOURCE === 'string' ? env.CATALOG_SOURCE.trim().toLowerCase() : '';
  if (fromEnv === 'db') return CATALOG_SOURCES.db;
  return CATALOG_SOURCES.code;
}

export function isDbConfigured(env = process.env) {
  return Boolean(env?.DATABASE_URL);
}

let poolCache = null;
/** Test seam: drop the cached pool between mocked tests. */
export function _resetPoolCache() {
  poolCache = null;
}

/**
 * Server-side pg Pool for DATABASE_URL. The `pg` package is imported lazily
 * so this module loads (and tests run) without it installed; callers on
 * Render get it from package.json dependencies.
 */
export async function getPool({ env = process.env, pgModule } = {}) {
  if (poolCache) return poolCache;
  if (!isDbConfigured(env)) {
    // Names the variable; never prints its value.
    throw new Error('catalog pg unavailable: DATABASE_URL is not set');
  }
  const mod = pgModule ?? (await import('pg'));
  // DATABASE_URL is passed to the driver only — never logged or thrown.
  poolCache = new mod.Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }, // Render Postgres requires TLS
    ...POOL_CONFIG,
  });
  return poolCache;
}

export async function closePool() {
  if (poolCache) {
    const p = poolCache;
    poolCache = null;
    await p.end();
  }
}

/**
 * Run db/schema.sql idempotently (CREATE TABLE IF NOT EXISTS / CREATE INDEX
 * IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT DO NOTHING). Safe to run
 * on every API boot when DATABASE_URL is set.
 */
export async function migrate({ env = process.env, pgModule, pool, schemaPath } = {}) {
  const p = pool ?? (await getPool({ env, pgModule }));
  const sql = fs.readFileSync(schemaPath ?? SCHEMA_PATH, 'utf8');
  // node-postgres executes multi-statement scripts over the simple protocol.
  // Wrapped like reads: a labeled error, never the connection string.
  try {
    await p.query(sql);
  } catch (err) {
    throw pgUnavailable(err);
  }
  return { ok: true };
}

/**
 * Boot helper for the API entrypoint: resolves the catalog source and, when
 * the DB is selected and configured, runs migrate() first. Graceful when
 * DATABASE_URL is absent (falls back to the in-code catalog).
 */
export async function bootCatalog({ env = process.env, argv = [], pgModule } = {}) {
  const source = resolveCatalogSource({ argv, env });
  const dbConfigured = isDbConfigured(env);
  if (source === CATALOG_SOURCES.db && dbConfigured) {
    await migrate({ env, pgModule });
  }
  return { source, dbConfigured };
}

// ---------------------------------------------------------------------------
// pg-backed queries (DATABASE_URL values never reach log/error strings)
// ---------------------------------------------------------------------------

function pgUnavailable(cause) {
  const err = new Error('postgres catalog unavailable');
  err.status = 503;
  err.cause = cause;
  return err;
}

async function queryRows(pool, text, params) {
  try {
    const res = await pool.query(text, params);
    return res.rows ?? [];
  } catch (err) {
    throw pgUnavailable(err);
  }
}

async function getDbTrials(pool) {
  const [trials, predicates, sites] = await Promise.all([
    queryRows(pool, 'SELECT nct_id, title, status, phases, conditions, sponsor FROM trials ORDER BY nct_id'),
    queryRows(
      pool,
      'SELECT nct_id, predicate_type, operator, value, unit, source_text, confidence, mapped_by FROM eligibility_predicates ORDER BY nct_id',
    ),
    queryRows(pool, 'SELECT nct_id, facility, city, country, status FROM trial_sites ORDER BY nct_id'),
  ]);
  const predByTrial = new Map();
  const siteByTrial = new Map();
  for (const p of predicates) {
    if (!predByTrial.has(p.nct_id)) predByTrial.set(p.nct_id, []);
    predByTrial.get(p.nct_id).push(p);
  }
  for (const s of sites) {
    if (!siteByTrial.has(s.nct_id)) siteByTrial.set(s.nct_id, []);
    siteByTrial.get(s.nct_id).push(s);
  }
  return trials.map((t) => ({
    ...publicTrialFromDbRow(t, predByTrial.get(t.nct_id) ?? [], siteByTrial.get(t.nct_id) ?? []),
    fetchedFrom: 'render-postgres-catalog', // honest label: not the Supabase track
  }));
}

async function getDbSnapshot(pool) {
  const [trials, predicates] = await Promise.all([
    queryRows(pool, 'SELECT nct_id, title, status, phases, conditions, sponsor FROM trials ORDER BY nct_id'),
    queryRows(
      pool,
      'SELECT nct_id, predicate_type, operator, value, unit, source_text, confidence FROM eligibility_predicates ORDER BY nct_id',
    ),
  ]);
  const predByTrial = new Map();
  for (const p of predicates) {
    if (!predByTrial.has(p.nct_id)) predByTrial.set(p.nct_id, []);
    predByTrial.get(p.nct_id).push(p);
  }
  return trials.map((t) => projectSnapshotRow(t, predByTrial.get(t.nct_id) ?? []));
}

// ---------------------------------------------------------------------------
// Public API — same interface as catalog-db.mjs (getTrials/getTrial/
// getCatalogVersion/resolveCatalogSource) plus pgModule/pool injection.
// ---------------------------------------------------------------------------

function effectiveSource(requested, env) {
  if (requested === CATALOG_SOURCES.db && !isDbConfigured(env)) {
    return CATALOG_SOURCES.code; // graceful, labeled fallback
  }
  return requested;
}

/** All public trials from the selected source. Never mutates cached rows. */
export async function getTrials({ source, env = process.env, pgModule, pool, ...codeOpts } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    const p = pool ?? (await getPool({ env, pgModule }));
    return (await getDbTrials(p)).map((t) => ({ ...t, catalogSource: 'db' }));
  }
  const trials = await getCodeTrials(codeOpts);
  const label = requested === CATALOG_SOURCES.db ? 'code (db requested; DATABASE_URL unset)' : 'code';
  return trials.map((t) => ({ ...t, catalogSource: label }));
}

/** One public trial by NCT id, or null when unknown. */
export async function getTrial(nctId, { source, env = process.env, pgModule, pool, ...codeOpts } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    const p = pool ?? (await getPool({ env, pgModule }));
    const trials = await getDbTrials(p);
    const found = trials.find((t) => t.trialId === nctId) ?? null;
    return found ? { ...found, catalogSource: 'db' } : null;
  }
  const trial = await getCodeTrial(nctId, codeOpts);
  if (!trial) return null;
  const label = requested === CATALOG_SOURCES.db ? 'code (db requested; DATABASE_URL unset)' : 'code';
  return { ...trial, catalogSource: label };
}

/**
 * SHA-256 hex of the canonical catalog snapshot — the integrity commitment
 * to serve as a public input to the ZK proof. Deterministic: same catalog
 * content always yields the same hash, on either source.
 */
export async function getCatalogVersion({ source, env = process.env, pgModule, pool } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    const p = pool ?? (await getPool({ env, pgModule }));
    return canonicalCatalogHash(await getDbSnapshot(p));
  }
  return canonicalCatalogHash(codeSnapshotRows());
}
