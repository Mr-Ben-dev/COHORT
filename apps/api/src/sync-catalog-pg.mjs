#!/usr/bin/env node
/**
 * apps/api/src/sync-catalog-pg.mjs — one-shot sync of PUBLIC recruiting-trial
 * metadata from ClinicalTrials.gov API v2 into the Render Postgres catalog
 * cache (cohort-catalog-db). (REPLACES the Supabase recommendation.)
 *
 * Run as a Render ONE-OFF JOB (dashboard > service > Jobs, or `render` CLI):
 *   node apps/api/src/sync-catalog-pg.mjs
 * with DATABASE_URL set as a server-side env var on the job (same value as
 * on the API service). Runs migrate() first so the schema exists.
 *
 * TRUST BOUNDARY: writes ONLY public metadata (already on ClinicalTrials.gov)
 * and hand-mapped predicate seeds. NEVER writes patient attributes, witnesses,
 * salts, nullifier preimages, issuer keys, or user identities.
 *
 * Required env (never committed, never logged — not even on failure):
 *   DATABASE_URL   Render Postgres connection string (server-side only)
 * Optional env:
 *   CTGOV_PAGE_SIZE   default 100 (CT.gov max 1000)
 *   SYNC_MAX_PAGES    default 0 = follow nextPageToken until exhausted
 *   SYNC_DRY_RUN=1    fetch + print counts only, no writes
 *
 * After upserting, the script recomputes the catalog-version SHA-256 hash
 * (canonicalCatalogHash, shared with apps/api/src/catalog-db.mjs via
 * catalog-pg.mjs) over the live snapshot and stores it in
 * sync_state.catalog_version — the integrity commitment the ZK proof consumes
 * as a public input.
 *
 * NOT live-tested against Render Postgres from this environment: this VM
 * cannot complete the Postgres SSL handshake (egress proxy interferes).
 * Services running ON Render connect fine — first live run happens there.
 */

import { migrate } from './catalog-pg.mjs';
import { canonicalCatalogHash, projectSnapshotRow } from './catalog-db.mjs';

const CTGOV_STUDIES = 'https://clinicaltrials.gov/api/v2/studies';
const CTGOV_FIELDS = [
  'NCTId',
  'BriefTitle',
  'OverallStatus',
  'Phase',
  'Condition',
  'LeadSponsorName',
  'LocationFacility',
  'LocationCity',
  'LocationCountry',
  'LocationStatus',
].join(',');

const HAND_MAPPED_BY = 'hand:apps/api/src/trials.mjs';

function die(message) {
  // Names the missing variable; never prints its value.
  console.error(`sync-catalog-pg.mjs: ${message}`);
  process.exit(2);
}

function readEnv() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) die('DATABASE_URL is not set.');
  return {
    url: DATABASE_URL, // passed to pg only; never logged
    pageSize: Math.min(Math.max(Number(process.env.CTGOV_PAGE_SIZE) || 100, 1), 1000),
    maxPages: Math.max(Number(process.env.SYNC_MAX_PAGES) || 0, 0),
    dryRun: process.env.SYNC_DRY_RUN === '1',
  };
}

// ---------------------------------------------------------------------------
// ClinicalTrials.gov API v2 paging
// ---------------------------------------------------------------------------

async function* pageStudies(cfg) {
  let pageToken = null;
  let pages = 0;
  for (;;) {
    const url = new URL(CTGOV_STUDIES);
    url.searchParams.set('filter.overallStatus', 'RECRUITING');
    url.searchParams.set('fields', CTGOV_FIELDS);
    url.searchParams.set('pageSize', String(cfg.pageSize));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
    });
    if (!res.ok) throw new Error(`clinicaltrials.gov -> ${res.status}`);
    const data = await res.json();
    yield data.studies ?? [];
    pages += 1;
    pageToken = data.nextPageToken ?? null;
    if (!pageToken) break;
    if (cfg.maxPages > 0 && pages >= cfg.maxPages) break;
  }
}

function trialRowFromStudy(study) {
  const p = study.protocolSection ?? {};
  const ident = p.identificationModule ?? {};
  const status = p.statusModule ?? {};
  const design = p.designModule ?? {};
  const sponsor = p.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
  const conditions = p.conditionsModule?.conditions ?? [];
  return {
    nct_id: ident.nctId,
    title: ident.briefTitle ?? ident.nctId,
    status: status.overallStatus ?? 'RECRUITING',
    phases: Array.isArray(design.phases) ? design.phases : [],
    conditions: Array.isArray(conditions) ? conditions : [],
    sponsor,
    raw: study, // public CT.gov API v2 object as fetched (fields-limited)
    synced_at: new Date().toISOString(),
  };
}

function siteRowsFromStudy(study) {
  const nctId = study.protocolSection?.identificationModule?.nctId;
  const locations = study.protocolSection?.contactsLocationsModule?.locations ?? [];
  return locations.map((loc) => ({
    nct_id: nctId,
    facility: loc.facility ?? null,
    city: loc.city ?? null,
    country: loc.country ?? null,
    status: loc.status ?? null,
  }));
}

// ---------------------------------------------------------------------------
// pg writes
// ---------------------------------------------------------------------------

async function upsertTrial(client, row) {
  await client.query(
    `INSERT INTO trials (nct_id, title, status, phases, conditions, sponsor, raw, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (nct_id) DO UPDATE SET
       title = EXCLUDED.title,
       status = EXCLUDED.status,
       phases = EXCLUDED.phases,
       conditions = EXCLUDED.conditions,
       sponsor = EXCLUDED.sponsor,
       raw = EXCLUDED.raw,
       synced_at = EXCLUDED.synced_at`,
    [row.nct_id, row.title, row.status, row.phases, row.conditions, row.sponsor, row.raw, row.synced_at],
  );
}

async function refreshSites(client, nctId, sites) {
  await client.query('BEGIN');
  try {
    await client.query('DELETE FROM trial_sites WHERE nct_id = $1', [nctId]);
    if (sites.length > 0) {
      const placeholders = [];
      const params = [];
      sites.forEach((s, i) => {
        const o = i * 5;
        placeholders.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5})`);
        params.push(s.nct_id, s.facility, s.city, s.country, s.status);
      });
      await client.query(
        `INSERT INTO trial_sites (nct_id, facility, city, country, status) VALUES ${placeholders.join(',')}`,
        params,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Seed hand-mapped predicate rows for trials present in TRIAL_MAPPINGS, but
 * ONLY when the trial has no predicate rows yet — never clobbers human edits
 * made directly in the database.
 */
async function seedHandMappedPredicates(client, TRIAL_MAPPINGS, nctId) {
  const mapping = TRIAL_MAPPINGS[nctId];
  if (!mapping) return 0;
  const { rows } = await client.query('SELECT id FROM eligibility_predicates WHERE nct_id = $1 LIMIT 1', [
    nctId,
  ]);
  if (rows.length > 0) return 0;
  const seeds = [];
  if (mapping.requireCondition) {
    seeds.push({
      nct_id: nctId,
      predicate_type: 'condition_flag',
      operator: 'require',
      value: { required: true },
      unit: null,
      source_text: mapping.conditionLabel ?? 'hand-mapped condition flag',
      confidence: 'hand-mapped',
      mapped_by: HAND_MAPPED_BY,
    });
  }
  if (mapping.forbidMedication) {
    seeds.push({
      nct_id: nctId,
      predicate_type: 'medication_flag',
      operator: 'forbid',
      value: { forbidden: true },
      unit: null,
      source_text: mapping.medicationLabel ?? 'hand-mapped medication flag',
      confidence: 'hand-mapped',
      mapped_by: HAND_MAPPED_BY,
    });
  }
  for (const s of seeds) {
    await client.query(
      `INSERT INTO eligibility_predicates
         (nct_id, predicate_type, operator, value, unit, source_text, confidence, mapped_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [s.nct_id, s.predicate_type, s.operator, s.value, s.unit, s.source_text, s.confidence, s.mapped_by],
    );
  }
  return seeds.length;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const cfg = readEnv();
  const { TRIAL_MAPPINGS } = await import('./trials.mjs');

  // Lazily import pg so the script fails loudly here (not at module load)
  // if the dependency is missing on the job host.
  let pg;
  try {
    pg = await import('pg');
  } catch (err) {
    die(`the 'pg' package is not installed on this host: ${err.message}`);
  }
  const pool = new pg.Pool({
    connectionString: cfg.url, // never logged
    ssl: { rejectUnauthorized: true }, // Render Postgres requires TLS
    connectionTimeoutMillis: 8000,
  });

  try {
    console.log('sync-catalog-pg.mjs: running migrate() (idempotent schema)');
    await migrate({ pool });

    let seen = 0;
    let upserted = 0;
    let predicatesSeeded = 0;

    for await (const studies of pageStudies(cfg)) {
      for (const study of studies) {
        const row = trialRowFromStudy(study);
        if (!row.nct_id) continue;
        seen += 1;
        if (cfg.dryRun) continue;

        const client = await pool.connect();
        try {
          await upsertTrial(client, row);
          upserted += 1;
          // Refresh site listings for this trial (delete + insert keeps the
          // sync idempotent without a natural key on the table).
          await refreshSites(client, row.nct_id, siteRowsFromStudy(study));
          predicatesSeeded += await seedHandMappedPredicates(client, TRIAL_MAPPINGS, row.nct_id);
        } finally {
          client.release();
        }
      }
      console.log(
        `sync-catalog-pg.mjs: page done — seen=${seen} upserted=${upserted} predicates_seeded=${predicatesSeeded}`,
      );
    }

    let catalogVersion = null;
    if (!cfg.dryRun) {
      // Recompute the version hash over the live snapshot with the exact same
      // canonicalization the API read layer uses.
      const trialsRes = await pool.query(
        'SELECT nct_id, title, status, phases, conditions, sponsor FROM trials ORDER BY nct_id',
      );
      const predRes = await pool.query(
        'SELECT nct_id, predicate_type, operator, value, unit, source_text, confidence FROM eligibility_predicates ORDER BY nct_id',
      );
      const predByTrial = new Map();
      for (const p of predRes.rows) {
        if (!predByTrial.has(p.nct_id)) predByTrial.set(p.nct_id, []);
        predByTrial.get(p.nct_id).push(p);
      }
      const snapshot = trialsRes.rows.map((t) => projectSnapshotRow(t, predByTrial.get(t.nct_id) ?? []));
      catalogVersion = canonicalCatalogHash(snapshot);
      await pool.query(
        `UPDATE sync_state SET last_synced_at = $1, trials_seen = $2, trials_upserted = $3,
           catalog_version = $4, notes = $5 WHERE id = 1`,
        [
          new Date().toISOString(),
          seen,
          upserted,
          catalogVersion,
          'CT.gov API v2 filter.overallStatus=RECRUITING',
        ],
      );
    }

    console.log(
      `sync-catalog-pg.mjs: done — seen=${seen} upserted=${upserted} predicates_seeded=${predicatesSeeded}` +
        (catalogVersion ? ` catalog_version=${catalogVersion}` : ' (dry run, no writes)'),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // err.message may contain row content (public); never env values.
  console.error(`sync-catalog-pg.mjs: FAILED — ${err.message}`);
  process.exit(1);
});
