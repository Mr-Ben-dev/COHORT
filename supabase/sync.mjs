#!/usr/bin/env node
/**
 * supabase/sync.mjs — one-shot sync of PUBLIC recruiting-trial metadata from
 * ClinicalTrials.gov API v2 into the Supabase catalog cache.
 *
 * TRUST BOUNDARY: writes ONLY public metadata (already on ClinicalTrials.gov)
 * and hand-mapped predicate seeds. NEVER writes patient attributes, witnesses,
 * salts, nullifier preimages, issuer keys, or user identities.
 *
 * Required env (never committed, never logged — not even on failure):
 *   SUPABASE_URL           e.g. https://xyzcompany.supabase.co
 *   SUPABASE_SERVICE_KEY   the service_role key (bypasses RLS for writes)
 * Optional env:
 *   CTGOV_PAGE_SIZE   default 100 (CT.gov max 1000)
 *   SYNC_MAX_PAGES    default 0 = follow nextPageToken until exhausted
 *   SYNC_DRY_RUN=1    fetch + print counts only, no writes
 *
 * After upserting, the script recomputes the catalog-version SHA-256 hash
 * (canonicalCatalogHash, shared with apps/api/src/catalog-db.mjs) over the
 * live snapshot and stores it in sync_state.catalog_version — the integrity
 * commitment the ZK proof consumes as a public input.
 *
 * Pure code: cannot be live-tested without Supabase credentials.
 */

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
  console.error(`sync.mjs: ${message}`);
  process.exit(2);
}

function readEnv() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL) die('SUPABASE_URL is not set.');
  if (!SUPABASE_SERVICE_KEY) die('SUPABASE_SERVICE_KEY is not set.');
  return {
    url: SUPABASE_URL.replace(/\/+$/, ''),
    serviceKey: SUPABASE_SERVICE_KEY,
    pageSize: Math.min(Math.max(Number(process.env.CTGOV_PAGE_SIZE) || 100, 1), 1000),
    maxPages: Math.max(Number(process.env.SYNC_MAX_PAGES) || 0, 0),
    dryRun: process.env.SYNC_DRY_RUN === '1',
  };
}

// ---------------------------------------------------------------------------
// Supabase REST (service_role; values never logged)
// ---------------------------------------------------------------------------

function sbFetch(cfg, path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  return fetch(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
  });
}

async function sb(cfg, path, opts = {}) {
  const res = await sbFetch(cfg, path, opts);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    const err = new Error(`supabase ${opts.method || 'GET'} ${path} -> ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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

/**
 * Seed hand-mapped predicate rows for trials present in TRIAL_MAPPINGS, but
 * ONLY when the trial has no predicate rows yet — never clobbers human edits
 * made directly in Supabase.
 */
async function seedHandMappedPredicates(cfg, TRIAL_MAPPINGS, nctId, dryRun) {
  const mapping = TRIAL_MAPPINGS[nctId];
  if (!mapping) return 0;
  const existing = await sb(
    cfg,
    `eligibility_predicates?select=id&nct_id=eq.${encodeURIComponent(nctId)}&limit=1`,
  );
  if (existing.length > 0) return 0;
  const rows = [];
  if (mapping.requireCondition) {
    rows.push({
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
    rows.push({
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
  if (rows.length === 0 || dryRun) return rows.length;
  await sb(cfg, 'eligibility_predicates', { method: 'POST', body: rows });
  return rows.length;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const cfg = readEnv();
  const { TRIAL_MAPPINGS } = await import('../apps/api/src/trials.mjs');
  const catalogDb = await import('../apps/api/src/catalog-db.mjs').catch(() => null);
  const { projectSnapshotRow, canonicalCatalogHash } = catalogDb ?? {};
  if (!projectSnapshotRow || !canonicalCatalogHash) {
    die('could not load apps/api/src/catalog-db.mjs (needed for the version hash).');
  }

  let seen = 0;
  let upserted = 0;
  let predicatesSeeded = 0;

  for await (const studies of pageStudies(cfg)) {
    for (const study of studies) {
      const row = trialRowFromStudy(study);
      if (!row.nct_id) continue;
      seen += 1;
      if (cfg.dryRun) continue;

      await sb(cfg, 'trials?onConflict=nct_id', {
        method: 'POST',
        body: row,
        prefer: 'resolution=merge-duplicates',
      });
      upserted += 1;

      // Refresh site listings for this trial (delete + insert keeps the
      // sync idempotent without a natural key on the table).
      const nct = encodeURIComponent(row.nct_id);
      await sb(cfg, `trial_sites?nct_id=eq.${nct}`, { method: 'DELETE' });
      const sites = siteRowsFromStudy(study);
      if (sites.length > 0) {
        await sb(cfg, 'trial_sites', { method: 'POST', body: sites });
      }

      predicatesSeeded += await seedHandMappedPredicates(cfg, TRIAL_MAPPINGS, row.nct_id, cfg.dryRun);
    }
    console.log(`sync.mjs: page done — seen=${seen} upserted=${upserted} predicates_seeded=${predicatesSeeded}`);
  }

  let catalogVersion = null;
  if (!cfg.dryRun) {
    // Recompute the version hash over the live snapshot with the exact same
    // canonicalization the API read layer uses.
    const trials = await sb(cfg, 'trials?select=nct_id,title,status,phases,conditions,sponsor&order=nct_id');
    const predicates = await sb(
      cfg,
      'eligibility_predicates?select=nct_id,predicate_type,operator,value,unit,source_text,confidence&order=nct_id',
    );
    const predByTrial = new Map();
    for (const p of predicates) {
      if (!predByTrial.has(p.nct_id)) predByTrial.set(p.nct_id, []);
      predByTrial.get(p.nct_id).push(p);
    }
    const snapshot = trials.map((t) => projectSnapshotRow(t, predByTrial.get(t.nct_id) ?? []));
    catalogVersion = canonicalCatalogHash(snapshot);
    await sb(cfg, 'sync_state?id=eq.1', {
      method: 'PATCH',
      body: {
        last_synced_at: new Date().toISOString(),
        trials_seen: seen,
        trials_upserted: upserted,
        catalog_version: catalogVersion,
        notes: 'CT.gov API v2 filter.overallStatus=RECRUITING',
      },
    });
  }

  console.log(
    `sync.mjs: done — seen=${seen} upserted=${upserted} predicates_seeded=${predicatesSeeded}` +
      (catalogVersion ? ` catalog_version=${catalogVersion}` : ' (dry run, no writes)'),
  );
}

main().catch((err) => {
  // err.message may contain row content (public); never env values.
  console.error(`sync.mjs: FAILED — ${err.message}`);
  process.exit(1);
});
