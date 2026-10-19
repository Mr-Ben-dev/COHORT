/**
 * Supabase-backed read layer for the COHORT public trial catalog.
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
 *    from Supabase via the anon key (safe for frontend use; RLS grants anon
 *    SELECT only).
 *  - If source=db is requested but SUPABASE_URL / SUPABASE_ANON_KEY are not
 *    set, the module falls back to the in-code catalog and labels the
 *    response accordingly (graceful, labeled — never a silent substitution).
 *
 * SECRET HYGIENE: this module never logs or throws env var VALUES. Error and
 * log strings name the variable (e.g. "SUPABASE_ANON_KEY is not set") but never
 * interpolate its value. Covered by TESTS/catalog-db.test.mjs.
 *
 * SERVER.MJS WIRING (pending — apps/api/src/server.mjs is owned by SQUAD A,
 * do not edit concurrently; apply once A1/A7 clear it):
 *
 *   import { resolveCatalogSource, getTrials, getTrial, getCatalogVersion }
 *     from './catalog-db.mjs';
 *   const CATALOG = { source: resolveCatalogSource() }; // 'code' | 'db'
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

import { createHash } from 'node:crypto';
import {
  getPublicTrials as getCodeTrials,
  getTrial as getCodeTrial,
  TRIAL_MAPPINGS,
} from './trials.mjs';

export const CATALOG_SOURCES = Object.freeze({ code: 'code', db: 'db' });

const CTGOV_STUDY_URL = 'https://clinicaltrials.gov/study';
const FETCH_TIMEOUT_MS = 8000;

/**
 * Resolve which catalog to serve. CLI flag wins over env; default is 'code'
 * so existing deployments are untouched.
 */
export function resolveCatalogSource({ argv = [], env = process.env } = {}) {
  if (Array.isArray(argv) && argv.includes('--use-db')) return CATALOG_SOURCES.db;
  const fromEnv = typeof env?.CATALOG_SOURCE === 'string' ? env.CATALOG_SOURCE.trim().toLowerCase() : '';
  if (fromEnv === 'db' || argv.includes('--use-db')) return CATALOG_SOURCES.db;
  return CATALOG_SOURCES.code;
}

export function isDbConfigured(env = process.env) {
  return Boolean(env?.SUPABASE_URL) && Boolean(env?.SUPABASE_ANON_KEY);
}

/** Recursively sort object keys so hashing is key-order independent. */
export function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const sorted = (arr) => [...arr].sort();

/**
 * Canonical snapshot row used for the version hash. BOTH the sync script
 * (supabase/sync.mjs) and this read layer project rows through this exact
 * shape, so the hash they compute is identical for identical catalog content.
 *
 * Included: identity + public metadata + the hand-mapped predicates with
 * their provenance. Excluded: created_at/updated_at/synced_at (timestamps are
 * not content) and mapped_by (operational metadata, not predicate content).
 */
export function projectSnapshotRow(trial, predicates = []) {
  return {
    nct_id: trial.nct_id,
    title: trial.title ?? null,
    status: trial.status ?? null,
    phases: sorted(trial.phases ?? []),
    conditions: sorted(trial.conditions ?? []),
    sponsor: trial.sponsor ?? null,
    predicates: (predicates ?? [])
      .map((p) => ({
        predicate_type: p.predicate_type,
        operator: p.operator,
        value: p.value ?? null,
        unit: p.unit ?? null,
        source_text: p.source_text ?? null,
        confidence: p.confidence ?? null,
      }))
      .sort((a, b) =>
        stableStringify(a) < stableStringify(b) ? -1 : stableStringify(a) > stableStringify(b) ? 1 : 0,
      ),
  };
}

/** SHA-256 hex over the canonical snapshot. Deterministic: same rows in any
 *  order (or with keys in any order) produce the same hash. */
export function canonicalCatalogHash(snapshotRows) {
  const rows = [...(snapshotRows ?? [])].sort((a, b) =>
    String(a.nct_id) < String(b.nct_id) ? -1 : String(a.nct_id) > String(b.nct_id) ? 1 : 0,
  );
  return createHash('sha256').update(stableStringify(rows)).digest('hex');
}

/** Snapshot rows for the in-code catalog (apps/api/src/trials.mjs): the
 *  hand-mapped flags projected into the same predicate shape the DB uses, so
 *  the version hash commits to the same thing on both sources. */
export function codeSnapshotRows() {
  return Object.entries(TRIAL_MAPPINGS).map(([nctId, mapping]) => {
    const predicates = [];
    if (mapping.requireCondition) {
      predicates.push({
        predicate_type: 'condition_flag',
        operator: 'require',
        value: { required: true },
        unit: null,
        source_text: mapping.conditionLabel ?? null,
        confidence: 'hand-mapped',
      });
    }
    if (mapping.forbidMedication) {
      predicates.push({
        predicate_type: 'medication_flag',
        operator: 'forbid',
        value: { forbidden: true },
        unit: null,
        source_text: mapping.medicationLabel ?? null,
        confidence: 'hand-mapped',
      });
    }
    return projectSnapshotRow(
      { nct_id: nctId, title: null, status: 'RECRUITING', phases: [], conditions: [], sponsor: null },
      predicates,
    );
  });
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (anon key; RLS grants SELECT only)
// ---------------------------------------------------------------------------

function supabaseHeaders(env) {
  // Header VALUES come from env but are never logged or thrown.
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  };
}

async function restGet(env, path, fetchImpl) {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const url = `${base}/rest/v1/${path}`;
  let res;
  try {
    res = await fetchImpl(url, {
      headers: supabaseHeaders(env),
      signal: AbortSignal.timeout ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined,
    });
  } catch (err) {
    // Network-level failure: label it, keep env values out of the message.
    const labeled = new Error('supabase catalog unavailable');
    labeled.status = 503;
    labeled.cause = err;
    throw labeled;
  }
  if (!res.ok) {
    const err = new Error('supabase catalog unavailable');
    err.status = 503;
    err.cause = `GET ${path} -> ${res.status}`;
    throw err;
  }
  return res.json();
}

/** Map one DB trial row (+ its predicates/sites) onto the public-trial shape
 *  the API already serves. Typed fields that have no hand-mapped predicate
 *  stay null; unrecognized predicate types ride along in `predicates`. */
export function publicTrialFromDbRow(row, predicates = [], sites = []) {
  const first = (type) => predicates.find((p) => p.predicate_type === type);
  const age = first('age_range');
  const sex = first('sex');
  const hv = first('healthy_volunteers');
  const cond = first('condition_flag');
  const med = first('medication_flag');
  return {
    trialId: row.nct_id,
    title: `${row.title} (typed subset)`,
    status: row.status,
    phases: row.phases ?? [],
    conditions: row.conditions ?? [],
    sponsor: row.sponsor,
    minAge: age?.value?.min ?? null,
    maxAge: age?.value?.max ?? null,
    sexCriterion: sex?.value?.allowed ?? 'ALL',
    healthyVolunteers: hv?.value?.allowed ?? false,
    requireCondition: cond?.value?.required ?? false,
    forbidMedication: med?.value?.forbidden ?? false,
    conditionLabel: cond?.source_text ?? null,
    medicationLabel: med?.source_text ?? null,
    predicates: predicates.map((p) => ({
      predicateType: p.predicate_type,
      operator: p.operator,
      value: p.value,
      unit: p.unit,
      sourceText: p.source_text,
      confidence: p.confidence,
      mappedBy: p.mapped_by,
    })),
    sites: sites.map((s) => ({
      facility: s.facility,
      city: s.city,
      country: s.country,
      status: s.status,
    })),
    source: `${CTGOV_STUDY_URL}/${row.nct_id}`,
    mapping: 'hand-mapped typed subset; free-text ClinicalTrials.gov criteria are not proven',
    unsupportedCriteria: null,
    fetchedFrom: 'supabase-catalog',
    catalogSource: 'db',
  };
}

async function getDbTrials(env, fetchImpl) {
  const [trials, predicates, sites] = await Promise.all([
    restGet(env, 'trials?select=nct_id,title,status,phases,conditions,sponsor&order=nct_id', fetchImpl),
    restGet(
      env,
      'eligibility_predicates?select=nct_id,predicate_type,operator,value,unit,source_text,confidence,mapped_by&order=nct_id',
      fetchImpl,
    ),
    restGet(env, 'trial_sites?select=nct_id,facility,city,country,status&order=nct_id', fetchImpl),
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
  return trials.map((t) =>
    publicTrialFromDbRow(t, predByTrial.get(t.nct_id) ?? [], siteByTrial.get(t.nct_id) ?? []),
  );
}

async function getDbSnapshot(env, fetchImpl) {
  const [trials, predicates] = await Promise.all([
    restGet(env, 'trials?select=nct_id,title,status,phases,conditions,sponsor&order=nct_id', fetchImpl),
    restGet(
      env,
      'eligibility_predicates?select=nct_id,predicate_type,operator,value,unit,source_text,confidence&order=nct_id',
      fetchImpl,
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
// Public API
// ---------------------------------------------------------------------------

function effectiveSource(requested, env) {
  if (requested === CATALOG_SOURCES.db && !isDbConfigured(env)) {
    return CATALOG_SOURCES.code; // graceful, labeled fallback
  }
  return requested;
}

/** All public trials from the selected source. Never mutates cached rows. */
export async function getTrials({ source, env = process.env, fetchImpl = globalThis.fetch, ...codeOpts } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    return getDbTrials(env, fetchImpl);
  }
  const trials = await getCodeTrials(codeOpts);
  const label = requested === CATALOG_SOURCES.db ? 'code (db requested; SUPABASE_* unset)' : 'code';
  return trials.map((t) => ({ ...t, catalogSource: label }));
}

/** One public trial by NCT id, or null when unknown. */
export async function getTrial(nctId, { source, env = process.env, fetchImpl = globalThis.fetch, ...codeOpts } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    const trials = await getDbTrials(env, fetchImpl);
    return trials.find((t) => t.trialId === nctId) ?? null;
  }
  const trial = await getCodeTrial(nctId, codeOpts);
  if (!trial) return null;
  const label = requested === CATALOG_SOURCES.db ? 'code (db requested; SUPABASE_* unset)' : 'code';
  return { ...trial, catalogSource: label };
}

/**
 * SHA-256 hex of the canonical catalog snapshot — the integrity commitment
 * to serve as a public input to the ZK proof. Deterministic: same catalog
 * content always yields the same hash, on either source.
 */
export async function getCatalogVersion({ source, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const requested = source ?? resolveCatalogSource({ env });
  const use = effectiveSource(requested, env);
  if (use === CATALOG_SOURCES.db) {
    return canonicalCatalogHash(await getDbSnapshot(env, fetchImpl));
  }
  return canonicalCatalogHash(codeSnapshotRows());
}
