-- =============================================================================
-- COHORT public trial-catalog cache — Render Postgres schema
-- Applied by apps/api/src/catalog-pg.mjs migrate() on API boot (idempotent),
-- and by the one-off job apps/api/src/sync-catalog-pg.mjs before syncing.
-- (REPLACES the Supabase recommendation; the schema is identical apart from
-- the access model — see ACCESS below.)
--
-- TRUST BOUNDARY (non-negotiable):
--   This database holds ONLY:
--     1. public trial metadata already published on ClinicalTrials.gov
--        (NCT id, title, status, phases, conditions, sponsor, site listings)
--     2. hand-mapped eligibility predicates derived from that public data
--     3. mapping provenance: the raw criterion text each predicate was
--        hand-mapped from, plus who mapped it and when (audit trail)
--   This database NEVER holds:
--     patient attributes, circuit witnesses, salts, nullifier preimages,
--     issuer keys, or user identities. Nothing here is private to any user.
--
--   A compromise of this database leaks the public catalog (already public).
--   The real risk is INTEGRITY: poisoned predicates could mislead matching.
--   Mitigations:
--     a. every predicate row carries its raw source_text (audit trail), and
--     b. a SHA-256 catalog-version hash is computed over the full snapshot and
--        committed as a public input to the ZK proof, so a poisoned catalog
--        cannot silently substitute for the audited one.
--        (The circuit change is out of scope; the API serves the version hash
--        via getCatalogVersion() in apps/api/src/catalog-pg.mjs, and the sync
--        script stores it in sync_state.catalog_version.)
--
-- ACCESS:
--   Private Render Postgres (cohort-catalog-db, Oregon). There is NO
--   client-facing credential: the only connection string (DATABASE_URL) is a
--   server-side env var on the Render API service — never committed, never
--   logged, never VITE_* / never shipped to a frontend.
--   Reads go through apps/api/src/catalog-pg.mjs (server-side only).
--   Writes happen ONLY via the one-off job apps/api/src/sync-catalog-pg.mjs
--   (run from the Render dashboard / CLI with the same DATABASE_URL).
--   No Row Level Security is used: protection is the network/credential
--   boundary (no client-side access at all), not in-database policy. If a
--   client-facing credential is ever introduced, add RLS + SELECT-only
--   policies mirroring the old supabase/schema.sql before shipping it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- trials: one row per ClinicalTrials.gov study (public metadata only)
-- ---------------------------------------------------------------------------
create table if not exists trials (
  nct_id     text primary key,                       -- e.g. 'NCT07153614'
  title      text not null,
  status     text not null default 'RECRUITING',     -- CT.gov overallStatus
  phases     text[] not null default '{}',           -- e.g. {'PHASE2'}
  conditions jsonb not null default '[]',            -- list of condition names
  sponsor    text,
  raw        jsonb,                                   -- full CT.gov API v2 study JSON (public)
  synced_at  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trial_sites: recruiting site listings per trial (public)
-- ---------------------------------------------------------------------------
create table if not exists trial_sites (
  id       bigint generated always as identity primary key,
  nct_id   text not null references trials (nct_id) on delete cascade,
  facility text,
  city     text,
  country  text,
  status   text                                      -- CT.gov location status
);
create index if not exists trial_sites_nct_id_idx on trial_sites (nct_id);

-- ---------------------------------------------------------------------------
-- eligibility_predicates: HAND-MAPPED typed predicates per trial.
-- These are derived from public criteria text by a human (or from a reviewed
-- hand-mapping in apps/api/src/trials.mjs). Free-text criteria are NEVER
-- auto-mapped here: unmapped prose stays out of the circuit by design.
--
-- Predicate vocabulary (predicate_type / operator / value):
--   age_range         / between / {"min": 18, "max": 80, "unit": "years"}
--   sex               / in      / {"allowed": "ALL" | "MALE" | "FEMALE"}
--   healthy_volunteers/ eq      / {"allowed": true | false}
--   condition_flag    / require / {"required": true}        (+ unit/label optional)
--   medication_flag   / forbid  / {"forbidden": true}        (+ unit/label optional)
-- New predicate types may be added by hand-mapping; the API passes through
-- any rows it does not recognize into the `predicates` array.
-- ---------------------------------------------------------------------------
create table if not exists eligibility_predicates (
  id             bigint generated always as identity primary key,
  nct_id         text not null references trials (nct_id) on delete cascade,
  predicate_type text not null,
  operator       text not null,
  value          jsonb not null,
  unit           text,
  source_text    text not null,                       -- raw criterion text (audit trail)
  confidence     text not null default 'hand-mapped'
                   check (confidence in ('hand-mapped', 'sponsor-verified', 'auto-draft')),
  mapped_by      text,                                -- e.g. 'hand:apps/api/src/trials.mjs'
  created_at     timestamptz not null default now()
);
create index if not exists eligibility_predicates_nct_id_idx
  on eligibility_predicates (nct_id);

-- ---------------------------------------------------------------------------
-- sync_state: exactly one row (id = 1) tracking the last CT.gov sync and the
-- current catalog-version hash (the ZK public input commitment).
-- ---------------------------------------------------------------------------
create table if not exists sync_state (
  id              smallint primary key check (id = 1),
  last_page_token text,
  last_synced_at  timestamptz,
  trials_seen     integer not null default 0,
  trials_upserted integer not null default 0,
  catalog_version text,                               -- sha256 hex of canonical snapshot
  notes           text
);
insert into sync_state (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trials_touch_updated_at on trials;
create trigger trials_touch_updated_at
  before update on trials
  for each row execute function touch_updated_at();

-- NOTE: deliberately no client-facing credential exists for this database, so
-- there are no GRANTs/RLS policies here. Writes are restricted to the holder
-- of the server-side DATABASE_URL (the Render API service + the one-off sync
-- job). If a client credential is ever added, introduce RLS + SELECT-only
-- policies first — never widen these catalog tables to writes.
