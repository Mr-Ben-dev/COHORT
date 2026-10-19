# COHORT — What changed since Wave 1 (Wave-3 resubmission)

Squad E / E3. Status: DRAFT. Written 2026-10-19 ~05:45 EEST. Purpose: the venue
requires "meaningful new progress" plus a "what changed" write-up for this
resubmission — this file is that write-up.

**Honesty rule for this file:** every claim traces to a file or commit named in
the traceability table at the end. Anything not yet on Preprod is marked
`[FILL AFTER DEPLOY]` or `[TBD]`. No pilots, users, partners, or outcomes are
claimed anywhere.

## Wave-1 baseline (the delta is measured against this)

- Preprod contract `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`
  (`proveEligible`, self-asserted attributes).
- Verifier SHA-256 `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`.
- Documented 1AM gold-path tx `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60`
  (NCT07153614, 2026-09-13).
- 108 tests pass, last recorded full `npm test` 2026-09-16.
- 2-trial catalog (NCT04200963, NCT07153614).

---

## 1. RESURRECTED — dead indexer → Blockfrost, honestly labeled

**What broke:** the official Preprod indexer/RPC
(`indexer.preprod.midnight.network`, `rpc.preprod.midnight.network`) was shut
down (HTTP 410) — every read path in the repo pointed at a dead host.

**What changed (commit `2ca0488`):**
- All indexer/RPC reads move to Blockfrost Preprod, serving the same Midnight
  indexer GraphQL schema:
  - Indexer GraphQL: `https://midnight-preprod.blockfrost.io/api/v0`
  - Indexer WS: `wss://midnight-preprod.blockfrost.io/api/v0/ws`
  - Node RPC: `https://rpc.midnight-preprod.blockfrost.io`
- New helper `packages/dapp/src/blockfrost.mjs`: token goes as `?project_id=`
  query param (header auth 404s), idempotent, fails closed with a labeled
  "indexer token not configured" error when the token is absent.
- `/api/public-state` (`apps/api/src/server.mjs`, committed in `2ca0488`) now
  reads the live ledger from the Blockfrost indexer and labels its provenance:
  `source: 'blockfrost-preprod'` with real counters when the token is
  configured; `source: 'unavailable'` with a plain-language reason when it is
  not; HTTP 502 when the indexer query fails. It never emits fake numbers.
- Regression guard `TESTS/no-dead-indexer.test.mjs` (commit `77fb2ca`): fails if
  any live file still references the retired hosts — registered in the root
  test script.

**Cutover status:** A1 migration still RUNNING at write time (8 live files —
`apps/web/cohort-dapp.js`, `web/public/dapp/cohort-dapp.js`,
`packages/dapp/src/providers.mjs`, two gold-path/Playwright tests — still
reference dead hosts; the regression test fails until the migration lands, by
design). A7 (`/api/public-state` live-counter polish) and A8 (keep-alive,
README curl fixes) are NOT STARTED, waiting on A1. Nothing above is presented
as finished until the regression test passes.

## 2. NEW CIRCUITS — issuer-attested eligibility (hash-native), UNDEPLOYED

**Why:** Wave 1's honest gap was that eligibility facts are self-asserted —
the circuit checks the predicate, not who asserted the inputs. Wave 3 adds a
demo issuer that attests the patient's attribute bundle first; the patient
proves *over attested attributes*.

**What changed:**
- B1 DONE — `CONTRACT/cohort.compact` extended (commit `2fea963`, +125 lines):
  new ledger `attestations: Set<Bytes<32>>` and counter `attestationsVerified`;
  new circuits `attest()` / `attestWithAttributes()` / `proveAttested()`;
  helpers `attestationOf()` / `issuerIdOf()`; `proveEligible` + `trialNullifier`
  **byte-identical to the deployed version** (commit `d828db2` removed the dead
  `wSex` witness; B5 measured the verifier SHA as byte-identical to the Wave-1
  pin — see `docs/verifier-keys.md`, working tree, pending integrator commit).
- `proveAttested` writes a **program-scoped nullifier**
  `persistentHash(["cohort:attnul", trialId, attestation])` — one qualification
  claim per trial per attested attribute bundle; same predicate asserts as
  `proveEligible`; nothing private crosses the ledger except hashes and
  counters.
- Full-ZK compile passed on compactc 0.31.1 (no `--skip-zk`); new verifier SHAs
  measured and pinned (`scripts/judge-pins.mjs`, `verifyAllVerifierKeys()`):
  - `attest`: `93f5b746871ad5eb5579e675e1913dc7b5aa830e0cea8ba602aa4e27f1c91303`
  - `attestWithAttributes`: `84c89c88fa62c3a1cea7ffbbc67d4f0d0036bc844aff6f74e7d34413047320f4`
  - `proveAttested`: `a457129525ef3e0458dde077872df02c98d4647d39f278b2d0883f7b11275e13`
- Circuit documentation `docs/circuits.md` (commit `d3615bc`, 179 lines): both
  circuits, the issuer-attested trio, the trust boundary, and the honest
  limits — Wave-1 inputs are self-attested, the issuer gate is demo-grade (the
  baked-in `ISSUER_ID` is the raw 32 secret bytes because `disclose()` is the
  identity at the value level — see STATUS.md §B1 deviation 3), and the circuit
  cannot prove medical-record authenticity.

**Demo issuer ceremony:** `scripts/issuer-ceremony.mjs` (B2 RUNNING — script
written + tested, clean exit 2 pre-B1; polling for the B1 interface;
`.gitignore` covers `scripts/.issuer-secret.json`).

**Deployment status: UNDEPLOYED.** No chain writes in this run — owner has not
confirmed a deploy. Pending owner-confirmed deploy:
- `[FILL AFTER DEPLOY]` new-contract Preprod address
- `[FILL AFTER DEPLOY]` issuer-ceremony tx hash
- `[FILL AFTER DEPLOY]` `attest` / `attestWithAttributes` / `proveAttested` tx hashes

Simulator happy-path (B3) and adversarial (B4) tests, proof-server measurement
(B6), and dapp wiring (B7) are NOT STARTED per STATUS.md.

## 3. PRODUCT DEPTH — landed vs in-progress (nothing shipped that isn't)

### LANDED (committed, tests green)

- **12-trial catalog** (D1 DONE, commit `c5cd0bd`): 2 → 12, hand-mapped typed
  subsets from ClinicalTrials.gov API v2. 10 new RECRUITING trials (3
  oncology, 3 cardiology, 2 diabetes, 2 neurology); each entry carries verbatim
  provenance and a non-empty `unsupported[]` honesty list of criteria the
  circuit cannot cover. `TESTS/trials-catalog.test.mjs` 11/11 green.
- **FHIR R4 / Synthea synthetic-record import, browser-local** (D3 DONE, commit
  `23ffd83`): 3 curated synthetic bundles (`web/public/fhir-demo/*`), parser
  + path map (`web/src/lib/fhir-import.mjs` / `.ts`), `/import` UI route, trust
  doc (`docs/fhir-trust.md`), tests. Synthetic only — no real patient data
  anywhere; nothing leaves the device.
- **Wallet matrix** (D4 DONE, commit `8726278`): GeroWallet primary, 1AM
  fallback, Lace flagged `proving:false` (fail-closed picker — no fake approve
  step). `packages/dapp/src/wallets.mjs`, `docs/wallet-trust.md`,
  `docs/wallet-demo-checklist.md`, `TESTS/wallet-matrix.test.mjs`.
- **Supabase public-catalog cache** (D5 DONE, commit `5a975ca`): schema + RLS
  (`supabase/schema.sql`), CT.gov sync script (`supabase/sync.mjs`),
  anon-key read layer (`apps/api/src/catalog-db.mjs`), catalog-version hash
  plumbing, tests. Live test pending Supabase credentials; `server.mjs`
  `--use-db` / `CATALOG_SOURCE` wiring pending A1/A7 (verbatim patch staged in
  `supabase/README.md`, not applied — file ownership).

### IN-PROGRESS / NOT STARTED (not claimed)

- Site verification console (D2, C2) — NOT STARTED.
- Truth gate (C1), two-tier demo (C3), proof-of-execution wiring C4 (waits on
  the new contract), judge credentials (C5), CI (C6), honest non-claims README
  (C7) — NOT STARTED.
- `/api/public-state` reads live via Blockfrost today (see §1); A7 counter
  polish pending.

## 4. COMMUNICATION — script + deck

- **Demo video script** (E1 DONE, commits `179b425`, `4b00e00`):
  `docs/video-script.md` — word-for-word shooting script, ≤4:00, mission in
  the first 30 seconds, zero spoken jargon (no "ZK-SNARK", no "nullifier"),
  every number sourced to `~/workspace/cohort-wave2/DOMAIN-RESEARCH.md`,
  `[FILL AFTER DEPLOY]` on every tx hash/address, with a two-tier simulator
  fallback if the deploy misses shoot day.
- **Pitch deck outline** (E2 DONE, commit `6605830`): `docs/deck-outline.md` —
  12 slides + speaker-prep appendix; real numbers only with a per-number
  traceability table; Wave-3 deltas labeled `[TBD]` / `[FILL AFTER DEPLOY]`;
  explicit non-claims on the trust-boundary slide.

## What Wave 3 does NOT claim

- No real patients, no real issuer, no hospital endorsement. The issuer is a
  demo key; the issuer gate is demo-grade (STATUS.md §B1 deviation 3).
- Not HIPAA compliance, not medical certification, not enrollment, not
  full-protocol eligibility (per-trial `unsupported[]` lists say what is
  skipped).
- The new circuits are **undeployed** — they are specified, compiled,
  pinned, documented, and tested in the repo, but nothing about them is
  presented as live on Preprod until the ceremony and deploy txs exist.
- No numbers are invented: catalog counts are file-counted, test counts are
  runner-measured, and anything not yet available is an explicit placeholder.

## Traceability

| Claim | Source |
|---|---|
| Wave-1 contract address + verifier SHA | `docs/circuits.md` §1; STATUS.md §B1 spec |
| Gold-path tx `da8f79de…` (NCT07153614, 2026-09-13) | `docs/deck-outline.md` slide 8 |
| Blockfrost migration | commit `2ca0488`; `packages/dapp/src/blockfrost.mjs` |
| Dead hosts (HTTP 410) | commit `2ca0488` message |
| `/api/public-state` live-labeled | `apps/api/src/server.mjs` L227–269 (committed in `2ca0488`) |
| Dead-URL regression test | commit `77fb2ca` |
| wSex removal, SHA byte-identical | commit `d828db2` |
| New circuits (attest trio, ledger) | commit `2fea963`; STATUS.md §B1 interface |
| New verifier SHAs (pinned, undeployed) | `docs/verifier-keys.md` (working tree), `scripts/judge-pins.mjs` (working tree) |
| Issuer gate is demo-grade | STATUS.md §B1 deviation 3; `docs/circuits.md` honesty section |
| Ceremony script | `scripts/issuer-ceremony.mjs` (untracked; B2 RUNNING) |
| Circuit documentation | commit `d3615bc` (`docs/circuits.md`) |
| 12-trial catalog, 11/11 tests | commit `c5cd0bd`; `TESTS/trials-catalog.test.mjs` |
| FHIR import | commit `23ffd83`; `docs/fhir-trust.md` |
| Wallet matrix | commit `8726278`; `docs/wallet-trust.md` |
| Supabase cache | commit `5a975ca`; `supabase/README.md` |
| Video script | commits `179b425`, `4b00e00` (`docs/video-script.md`) |
| Deck outline | commit `6605830` (`docs/deck-outline.md`) |
