# COHORT public-catalog cache on Supabase

A Postgres-backed, publicly readable cache of the trial catalog. It mirrors
public ClinicalTrials.gov data plus the hand-mapped eligibility predicates so
the catalog is queryable and versioned without depending on CT.gov at request
time.

## Trust boundary (non-negotiable)

The database holds **ONLY**:

1. Public trial metadata already published on ClinicalTrials.gov
   (NCT id, title, status, phases, conditions, sponsor, site listings).
2. Hand-mapped eligibility predicates derived from that public data.
3. Mapping provenance: the raw criterion text each predicate was hand-mapped
   from, plus who mapped it and when (audit trail on every predicate row).

The database **NEVER** holds: patient attributes, circuit witnesses, salts,
nullifier preimages, issuer keys, or user identities. Nothing here is private
to any user.

Threat model: a compromise of this database leaks the public catalog, which
is already public. The real risk is **integrity** — poisoned predicates could
mislead matching. Two mitigations:

- Every predicate row carries its raw `source_text` (audit trail).
- A SHA-256 **catalog-version hash** is computed over the canonical snapshot
  (`canonicalCatalogHash` in `apps/api/src/catalog-db.mjs`, shared with the
  sync script) and stored in `sync_state.catalog_version`. It is served by the
  API via `getCatalogVersion()` and is designed to be committed as a **public
  input to the ZK proof**, so a poisoned catalog cannot silently substitute
  for the audited one. The circuit-side check is out of scope; this repo
  provides the version-hash plumbing.

## Setup

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. **Run the schema**: open the SQL editor and paste `supabase/schema.sql`.
   It creates `trials`, `trial_sites`, `eligibility_predicates`, `sync_state`,
   enables RLS everywhere, and adds public-SELECT policies for `anon`.
3. **Get the keys**: Project Settings → API.
   - `anon` `public` key → `SUPABASE_ANON_KEY` (safe for the frontend; RLS
     grants SELECT on catalog tables only, no writes).
   - `service_role` `secret` key → `SUPABASE_SERVICE_KEY` (sync script only;
     never ship it in client code, never commit it).
4. **Set env vars** (API host):
   ```
   SUPABASE_URL=https://xyzcompany.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   ```
   Service key is only needed where `supabase/sync.mjs` runs:
   ```
   SUPABASE_SERVICE_KEY=<service_role key>
   ```
5. **Sync**: `node supabase/sync.mjs`
   - Pages CT.gov API v2 (`filter.overallStatus=RECRUITING`), upserts trials,
     refreshes site listings, seeds hand-mapped predicate rows for trials in
     `TRIAL_MAPPINGS` (only when no predicate rows exist yet — never clobbers
     human edits), then recomputes the catalog-version hash into `sync_state`.
   - Optional: `CTGOV_PAGE_SIZE=100`, `SYNC_MAX_PAGES=10`, `SYNC_DRY_RUN=1`.
6. **Serve from the DB**: start the API with `--use-db` or set
   `CATALOG_SOURCE=db`. Default remains the in-code catalog (`code`), so
   existing deployments are untouched.
7. **Optional**: expose `GET /api/catalog-version` → `{ version, source }`
   via `getCatalogVersion()` (see the wiring snippet below).

## Tables

| Table | Contents |
|---|---|
| `trials` | `nct_id` PK, `title`, `status`, `phases[]`, `conditions` jsonb, `sponsor`, `raw` jsonb (full CT.gov API v2 study object as fetched), `synced_at` |
| `trial_sites` | `nct_id` FK, `facility`, `city`, `country`, `status` |
| `eligibility_predicates` | `nct_id` FK, `predicate_type`, `operator`, `value` jsonb, `unit`, `source_text` (raw criterion text — audit trail), `confidence` (`hand-mapped` \| `sponsor-verified` \| `auto-draft`), `mapped_by` |
| `sync_state` | single row (`id = 1`): last sync time, counts, `catalog_version` |

### Predicate vocabulary

| `predicate_type` | `operator` | `value` |
|---|---|---|
| `age_range` | `between` | `{"min": 18, "max": 80, "unit": "years"}` |
| `sex` | `in` | `{"allowed": "ALL" \| "MALE" \| "FEMALE"}` |
| `healthy_volunteers` | `eq` | `{"allowed": true \| false}` |
| `condition_flag` | `require` | `{"required": true}` |
| `medication_flag` | `forbid` | `{"forbidden": true}` |

Free-text criteria are **never** auto-mapped: unmapped prose stays out of
the circuit by design. New predicate types may be added by hand-mapping; the
API passes unrecognized rows through in the `predicates` array.

## Read layer (`apps/api/src/catalog-db.mjs`)

- `resolveCatalogSource()` — `--use-db` CLI flag or `CATALOG_SOURCE=db|code`
  (default `code`).
- `getTrials()`, `getTrial(nctId)` — DB via anon key when selected and
  configured; otherwise the in-code catalog from `apps/api/src/trials.mjs`
  (graceful, labeled fallback — responses carry `catalogSource`).
- `getCatalogVersion()` — SHA-256 hex of the canonical snapshot; deterministic
  (row order and key order independent); the ZK public-input commitment.
- Secret hygiene: env values are never logged or interpolated into errors
  (covered by `TESTS/catalog-db.test.mjs`).

## `server.mjs` wiring (pending — do not apply yet)

`apps/api/src/server.mjs` is owned by SQUAD A (A1 running, A7 queued) —
**do not edit it concurrently**. Once they clear it, apply this patch:

```diff
-import { getPublicTrials, getTrial, knownTrialId } from './trials.mjs';
+import { getPublicTrials, getTrial, knownTrialId } from './trials.mjs';
+import {
+  resolveCatalogSource,
+  getTrials as getDbTrials,
+  getTrial as getDbTrial,
+  getCatalogVersion,
+} from './catalog-db.mjs';
+
+const CATALOG_SOURCE = resolveCatalogSource({ argv: process.argv });
```

In the `/api/trials` handler replace `getPublicTrials()` with
`getDbTrials({ source: CATALOG_SOURCE })`; in `/api/trials/:id` replace
`getTrial(trialId)` with `getDbTrial(trialId, { source: CATALOG_SOURCE })`
(keep the `knownTrialId` 404 for the code source; when `CATALOG_SOURCE`
is `db`, 404 on `trial === null` instead). Optionally add:

```js
if (url.pathname === '/api/catalog-version' && req.method === 'GET') {
  const version = await getCatalogVersion({ source: CATALOG_SOURCE });
  return send(res, 200, { version, source: CATALOG_SOURCE }, 'public, max-age=300');
}
```

The existing code path is untouched when the flag/env is absent.

## What's blocked without Supabase credentials

- `supabase/sync.mjs` cannot run (needs `SUPABASE_SERVICE_KEY`).
- The `db` catalog source cannot be live-tested (needs `SUPABASE_URL` +
  `SUPABASE_ANON_KEY`); tests use a stubbed REST fetch instead.
- RLS policies cannot be verified against a live project; they are written
  and reviewed in `schema.sql` only.
- The `server.mjs` wiring is staged (snippet above) pending SQUAD A file
  ownership clearing — not a credentials issue, noted here so it isn't lost.

## Files

- `supabase/schema.sql` — tables, RLS, trust-boundary comments
- `supabase/sync.mjs` — CT.gov → Supabase sync (service_role, env-only)
- `supabase/README.md` — this file
- `apps/api/src/catalog-db.mjs` — anon-key read layer + version hash
- `TESTS/catalog-db.test.mjs` — fallback, hash determinism, secret hygiene
