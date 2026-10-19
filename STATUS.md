# COHORT Wave-3 Build — Coordinator Status
**Goal: FIRST PLACE. Integrator owns final merge. No pushes, no deploys, no chain writes.**

## Protocol
- Each worker updates ONLY its own section below (task / status / files touched / blockers), on start and on finish.
- **File ownership is exclusive** — no two workers edit the same file concurrently. Check the table before touching a file.
- Commit locally as squads complete. Messages in English. Never mention any other project/repo/person.
- Secrets: `BLOCKFROST_PROJECT_ID` lives in `~/workspace/cohort-wave2/.env` (chmod 600). Source it, never print it, never commit it. Token goes as `?project_id=` query param (header auth 404s).
- Blockfrost Preprod: indexer GraphQL POST `https://midnight-preprod.blockfrost.io/api/v0?project_id=...`, WS `wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=...`, RPC `https://rpc.midnight-preprod.blockfrost.io?project_id=...`.

## File ownership map
| Files | Owner |
|---|---|
| `CONTRACT/cohort.compact` | SQUAD B (contract author only) |
| `scripts/compile-contract.mjs`, `scripts/judge-pins.mjs` | SQUAD B (compile worker) — pins for new circuit |
| `scripts/issuer-ceremony.mjs` (new) | SQUAD B (ceremony worker) |
| `TESTS/attest-*.test.mjs`, `TESTS/prove-attested-*.test.mjs` (new) | SQUAD B (test workers) |
| `TESTS/judge-credentials/` (new) | SQUAD C (credentials worker) |
| `apps/api/src/server.mjs` | A1 (URL strings) then A7 (public-state logic) — SEQUENTIAL, not concurrent |
| `packages/dapp/src/*.mjs` | A1 (providers/public-state/tx-status/env/pins) |
| `web/src/lib/cohort-origin.ts`, `web/next.config.ts`, `web/src/components/layout/site-footer.tsx` | A1 |
| `apps/web/cohort-dapp.js` + `web/public/dapp/cohort-dapp.js` | A1 (update both identically or regenerate) |
| `scripts/build-dapp.mjs` | A1 |
| `render.yaml`, `.env.example` | A1 |
| `TESTS/no-dead-indexer.test.mjs` (new) | SQUAD A (regression worker) — new file only |
| `README.md` | A1 (URL strings only) → then A8 (curl commands) → then C7 (non-claims) — SEQUENTIAL |
| `packages/dapp/src/truth-gate.mjs` (new), wallet prove flow | SQUAD C (truth-gate worker) |
| `web/src/app/verify/*` (new), badges | SQUAD C (no-wallet worker) |
| `web/src/app/demo/*` (new) | SQUAD C (two-tier worker) |
| `apps/api/src/trials.mjs`, trial data | SQUAD D (catalog worker) |
| `supabase/*` (new), `apps/api/src/catalog-db.mjs` (new), `TESTS/catalog-db.test.mjs` (new) | SQUAD D (supabase worker, D5) |
| `apps/api/src/server.mjs` catalog-source wiring | PENDING SQUAD A (A1/A7) — verbatim patch staged in `supabase/README.md`, not applied (file ownership) |
| `web/src/app/sites/*` (new) | SQUAD D (console worker) |
| `packages/dapp/src/wallet/*` | SQUAD D (wallet worker) |
| `RESEARCH/fhir-spike.md` (new) | SQUAD D (FHIR worker) |
| `docs/video-script.md`, `docs/deck-outline.md`, `docs/what-changed.md`, `docs/submission-pack.md` (new) | SQUAD E |
| `scripts/deployer.mjs` (new) | SQUAD F — exclusive |
| `docs/deployer.md` (new) | SQUAD F — exclusive |

## SQUAD A — Resurrection
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| A1 | apps/api + packages/dapp + web lib + render.yaml + .env.example URL migration (SKIP: README curl, public-state logic, regression test) | c35f510a (running) | RUNNING | see ownership map | — |
| A5 | Repo-wide dead-URL regression test (`TESTS/no-dead-indexer.test.mjs` + register in package.json) | regression worker | DONE | `TESTS/no-dead-indexer.test.mjs` (new, committed 77fb2ca), root `package.json` test script | fails until A1 migration lands (expected — 8 live files still reference dead hosts, see report) |
| A6 | Toolchain re-pin + recompile + verifier SHA | integrator (done) | DONE | CONTRACT/cohort.compact (wSex removed, SHA byte-identical) | — |
| A7 | `/api/public-state` live counters via Blockfrost GraphQL + `GET /api/attestation-counters` | a7-live | DONE | `apps/api/src/blockfrost-live.mjs` (new), `apps/api/src/server.mjs`, `TESTS/public-state-live.test.mjs` (new, 16/16 pass), root `package.json` test script | none — note: Next route proxies for `/api/public-state` + `/api/attestation-counters` do not exist yet (only `config` + `trials`); web/ is not A7-owned, flagged for the web squad |
| A8 | Keep-alive + loading states + README curl fixes (after A1 finishes README) | a8-worker | DONE | scripts/keepalive.mjs (new), docs/keepalive.md (new), render.yaml (keep-alive doc header), README.md (both GraphQL curls: Blockfrost POST + ?project_id env token; public-state block now contractAction{state}), web/src/lib/proxy-cohort.ts (30s upstream timeout), web/src/features/referral/referral-view.tsx (stalled-referral error + retry), web/src/features/proofs/my-proofs-view.tsx (busy state on Share button) | none |

## SQUAD B — Hero circuit (hash-native)
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| B1 | Contract author: attestations Set, attest(), attestWithAttributes(), proveAttested(), attestationOf(), ISSUER_ID (interface spec in section below) | af979b4e (B1) | DONE | CONTRACT/cohort.compact | none — see deviations in interface spec |
| B2 | Demo issuer key-ceremony script | 44ab66df | DONE — ISSUER_ID pinned via issuerIdOf simulator circuit; judge1/2/3 credentials issued | scripts/issuer-ceremony.mjs (new), .gitignore (+scripts/.issuer-secret.json), CONTRACT/cohort.compact (ISSUER_ID pin only), TESTS/judge-credentials/judge{1,2,3}.json (new), packages/contract/managed/cohort/contract/* (simulator rebuild of B1 interface) | none (pins refresh is B5: verifier SHA will change on recompile) |
| B3 | Simulator happy-path tests | b3 worker (this run) | DONE — 6 tests, 6 pass, 26 assertions; registered in package.json test script | TESTS/attest-happy.test.mjs (new), root `package.json` test script | none |
| B4 | Refusal/adversarial tests | b4 worker (this run) | DONE — 7 tests, 7 pass; all 6 refusal paths reject in simulation, labeled demo-issuer; registered in package.json test script | TESTS/attest-adversarial.test.mjs (new), root `package.json` test script, STATUS.md (this row) | none |
| B5 | Full-ZK compile + verifier SHA record + pins update | 6f153b59 (B5) | DONE | docs/verifier-keys.md (new), scripts/judge-pins.mjs (additive pins + verifyAllVerifierKeys()) | proveEligible verifier SHA byte-identical to Wave-1 pin; 3 new circuits pinned, undeployed |
| B6 | Proof-server measurement | 63279733 (B6) | DONE (documented NOT MEASURED) | `docs/proof-server-measurements.md` (new), `scripts/measure-proving.mjs` (new, rerunnable harness) | No proof server in this VM (no docker/binary; repo never hosts one — client-side proving only); new-circuit JS bindings deleted by tree churn and no Compact compiler, so even local witness timing was impossible. Real bytes reported instead: prover keys attest 273 KiB / attestWithAttributes 4.96 MiB / proveEligible 4.97 MiB / proveAttested 9.51 MiB. Script probes server + builds unproven tx + .prove(); exits 2 (never fabricates) when infra is missing. |
| B7 | dapp wiring for new circuits | 63279733 (B7) | DONE | packages/dapp/src/attest.mjs (new), TESTS/attest-dapp.test.mjs (new), STATUS.md (this row) | none — 12 unit tests pass, 3 live paths skipped (need deployed attestation contract + COHORT_ATTEST_CONTRACT_ADDRESS) |
| B8 | Circuit documentation | B8 subagent (parent-orchestrator task) | DONE | `docs/circuits.md` (new, committed), `STATUS.md` (this row) | none — wrote from `CONTRACT/cohort.compact` as implemented + B1 interface spec (both circuits, issuer-attested trio, trust boundary, mermaid flow; honesty sections: self-asserted Wave-1 inputs, demo-grade issuer gate, circuit cannot prove medical-record authenticity) |

### B1 contract interface (binding) — AS IMPLEMENTED 2026-10-19, REVISED ~06:35 EEST
```compact
witness wHolderSecret(): Bytes<32>;
witness wNonce(): Bytes<32>;
witness wIssuerSecret(): Bytes<32>;
export ledger issuerId: Bytes<32>;   // installed ONCE by deployer via initIssuer(); zeros until then
export ledger attestations: Set<Bytes<32>>;
export ledger attestationsVerified: Counter;
export circuit initIssuer(id: Bytes<32>): Boolean   // one-time; asserts issuerId == 32 zero bytes, then issuerId = disclose(id)
export circuit attestationOf(age: Uint<8>, cond: Boolean, med: Boolean, holderSecret: Bytes<32>, nonce: Bytes<32>): Bytes<32>
export circuit issuerIdOf(secret: Bytes<32>): Bytes<32>   // ceremony helper: returns disclose(secret)
export circuit attest(attestation: Bytes<32>): Boolean  // assert(disclose(wIssuerSecret())==issuerId); replay-check; insert
export circuit attestWithAttributes(age: Uint<8>, cond: Boolean, med: Boolean, holderSecret: Bytes<32>, nonce: Bytes<32>): Boolean  // issuer-gated, computes attestationOf in-circuit
export circuit proveAttested(trialId: Bytes<32>, minAge: Uint<8>, maxAge: Uint<8>, requireCondition: Boolean, forbidMedication: Boolean): Boolean
```
DESIGN REVISION (integrator, 2026-10-19 ~06:35 EEST): the original `circuit issuerId(): Bytes<32>`
baked-literal design was ABANDONED — verified empirically that compactc 0.31.1 interprets
`\xNN` string escapes as Unicode codepoints and UTF-8-encodes them (byte >= 0x80 becomes
two bytes), so an arbitrary 32-byte secret cannot live in a literal (B2's real ceremony key
produced Bytes<50>, compile failed). The issuer identity is now the `issuerId` LEDGER,
installed once by the deployer via `initIssuer()`. The ceremony script no longer patches
the contract source; the deployer calls initIssuer(secret) post-deploy.
Verifier SHAs (full-ZK, compactc 0.31.1, re-measured): proveEligible 5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1
(byte-identical to Wave-1 pin), attest 9819eb36437ed0d4f24911eff41e502275ebbb6ed8466653946f63fa97c58ab1,
attestWithAttributes cbd12106fccbac72c04d2b60858871149209b2d164d2db02c4701d405dba6566,
proveAttested a457129525ef3e0458dde077872df02c98d4647d39f278b2d0883f7b11275e13 (unchanged —
never referenced issuerId), initIssuer 80df3538420f83b9e9dbe20e3ac6d1e52cde722633cd8449bcb1f00e9e400858.
All five pins verified MATCH in scripts/judge-pins.mjs. B3/B4 simulator tests updated to the
initIssuer flow (6/6 and 7/7 green).
## SQUAD C — Integration layer
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| C1 | Truth gate: poll Blockfrost for ledger effect before UI success | 19136020 (truth-gate worker) | DONE — 7/7 tests pass (6 mocked + 1 LIVE read of deployed contract, skips cleanly without token) | `packages/dapp/src/truth-gate.mjs` (new), `TESTS/truth-gate.test.mjs` (new) | — |
| C2 | No-wallet read path + live/sample badges (site console reads via same-origin proxy) | — | DONE (10/10 tests green, tsc clean) | web/src/lib/cohort-verify.mjs (new), web/src/app/verify/page.tsx + _components/verify-client.tsx + _components/provenance-badge.tsx (new), TESTS/cohort-verify.test.mjs (new) | NOTE: needs same-origin /api/public-state + /api/attestation-counters proxy routes (A1 proxy pattern exists for /api/config); A7's source strings must use "live-onchain" for green badge |
| C3 | Two-tier demo: in-browser simulator tier + wallet tier | c3-subagent | IN PROGRESS (code complete, tests 23/23 green) | web/src/app/demo/page.tsx (new), web/src/lib/demo-runner.mjs (new), TESTS/demo-tiers.test.mjs (new, in test script), package.json, STATUS.md | B2 ceremony done (ISSUER_ID pinned, judge credentials issued) — proveAttested demo still gated: browser build predates the pin (zero placeholder, verified by probe) + attested circuits undeployed; gate unlocks automatically on a rebuilt bundle |
| C4 | Proof-of-execution counter wiring (attestationsVerified → API → UI) | 2026-10-19 | DONE (tests 14/14 green) | web/src/components/attestation-counter.tsx (new), web/src/features/landing/landing-page.tsx (placement only), TESTS/attestation-counter.test.mjs (new) | A7 GET /api/attestation-counters not yet present — component degrades to honest "couldn't reach the counter API" until then; /verify left untouched (C2 ownership, excluded from C4) |
| C5 | Judge credential files + try-it-yourself doc | — | NOT STARTED | TESTS/judge-credentials/, docs/try-it.md | B2 (ceremony) |
| C6 | managed/ commit verification + CI green | c6-subagent | PARTIAL — managed/ committed current (9b4a196: initIssuer-ledger build, 7 circuits incl. attest/proveAttested, no secrets; supersedes 451d503) + workflow fixed (npm ci, 60-min compile / 45-min test timeouts, judge:verify w/ --skip-compile --skip-tests) | packages/contract/managed, .github/workflows/test.yml | NOT GREEN: npm test 123/158 pass, 35 fail — 12x TESTS/circuit-lib.mjs supplies 5 witnesses, compiled contract needs 8 (wHolderSecret/wIssuerSecret/wNonce; other squad's helper, TESTS/ excluded from C6), 18x no Edge browser at /opt/microsoft/msedge/msedge (this VM only; GH ubuntu-latest ships Edge), 3x BLOCKFROST_PROJECT_ID unset, 1x web/.next not built locally, 1x docs/what-changed.md dead-host refs (other squad); npm run judge:verify FAIL (5 checks: compile raced B2's broken ceremony literal — since fixed in working tree; web/.next; npm test; 2x indexer token). Re-run suite after circuit-lib update + secrets in CI env. |
| C7 | Honest non-claims README section + pinning tests | 9c68e5cc | DONE (tests 6/6 green) | docs/honest-non-claims.md, TESTS/non-claims.test.mjs, package.json (test script) | README merge by integrator (A8 owns README.md curl sections) |

## SQUAD D — Product depth
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| D1 | Trial catalog 2→12 hand-mapped | 2026-10-19 | DONE (tests 11/11 green) | apps/api/src/trials.mjs, scripts/ctgov-extract.mjs, data/ctgov/, TESTS/trials-catalog.test.mjs | 10 new RECRUITING trials (3 oncology, 3 cardiology, 2 diabetes, 2 neurology), each with verbatim provenance + non-empty unsupported[]; healthyVolunteers key already correct |
| D2 | Site verification console | D2 worker | DONE | web/src/app/sites/page.tsx + _components/{site-console,provenance-badge,counters-panel,trial-events,attestation-explainer}.tsx (new) | BLOCKERS (not code gaps): `/api/public-state` + `/api/attestation-counters` web routes don't exist (404 until web API proxy routes land); A7 attestation-counters endpoint pending in apps/api; SEAM: apps/api reports source "blockfrost-preprod" but cohort-verify.mjs only treats "live-onchain" as live — badge will honestly show SAMPLE DATA until the strings agree |
| D3 | FHIR R4 / Synthea synthetic-record import (browser-local): 3 curated synthetic bundles, parser + path map, /import UI route, demo live-server path, `requestAttestation()` handoff, trust doc, tests | 04eea10c | DONE | web/public/fhir-demo/* (3 new), web/src/lib/fhir-import.mjs (new), web/src/lib/fhir-import.ts (new), web/src/app/import/page.tsx (new), docs/fhir-trust.md (new), TESTS/fhir-import.test.mjs (new, in test script), package.json | — |
| D3-old | Wallet matrix (Lace primary investigation + code) — SUPERSEDED by the D4 row below | — | SUPERSEDED | — | — |
| D4 | Wallet matrix: GeroWallet primary, 1AM fallback, Lace flagged `proving:false` (code + web research, no pushes/deploys/chain writes) | d4 subagent | DONE | packages/dapp/src/wallets.mjs (new), docs/wallet-trust.md (new), docs/wallet-demo-checklist.md (new), TESTS/wallet-matrix.test.mjs (new, in test script), web copy: wallet-picker.tsx, wallet-modal.tsx, package.json | A1 concurrently editing packages/dapp/src — new file only, no edits to existing .mjs files |
| D5 | Supabase public-catalog cache: schema+RLS, CT.gov sync script, anon-key read layer, catalog-version hash plumbing, tests | 69379855 | DONE | `supabase/schema.sql`, `supabase/sync.mjs`, `supabase/README.md`, `apps/api/src/catalog-db.mjs`, `TESTS/catalog-db.test.mjs` (all new); root `package.json` test script | Supabase credentials (live test); `server.mjs` `--use-db`/`CATALOG_SOURCE` wiring pending A1/A7 (ownership) — verbatim patch in `supabase/README.md` |
| D6 | Render Postgres public-catalog cache (REPLACES the D5 Supabase recommendation): `db/schema.sql`, pg read layer w/ idempotent `migrate()`, CT.gov→pg sync one-off job, mocked tests | d6 subagent | DONE (tests 15/15 green) | `db/schema.sql`, `apps/api/src/catalog-pg.mjs`, `apps/api/src/sync-catalog-pg.mjs`, `TESTS/catalog-pg.test.mjs` (all new); root `package.json` (`pg` dep + test line); `STATUS.md` (this row) | NOT live-tested against Render Postgres — this environment cannot complete the Postgres SSL handshake (egress proxy interferes); first live run happens on Render (`migrate()` on API boot when DATABASE_URL is set, `sync-catalog-pg.mjs` one-off job); DATABASE_URL is server-side only on the Render API service; `server.mjs` wiring pending A1/A7 (ownership) — verbatim patch in `catalog-pg.mjs` header comment |

## SQUAD E — Communication
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| E1 | Video script ≤4min (mission in first 30s, new delta on screen) | SQUAD E | DONE | docs/video-script.md (new, committed 179b425) | tx hashes/addresses marked [FILL AFTER DEPLOY]; blockers cleared — script works on simulator tier if deploy misses shoot day |
| E2 | Deck outline (real numbers only, sourced) | — | DONE | docs/deck-outline.md (new) | DOMAIN-RESEARCH.md |
| E3 | What-changed + submission pack draft (new hashes only when available) | SQUAD E | DONE | `docs/what-changed.md` (new, committed), `docs/submission-pack-draft.md` (new, committed), `STATUS.md` (this row) | tx hashes/addresses remain `[FILL AFTER DEPLOY]` — new circuits undeployed; new verifier SHAs pinned and committed (`docs/verifier-keys.md`, `scripts/judge-pins.mjs`, 2016b45/dc97e10) |

## SQUAD F — Preprod deployer
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| F1 | `scripts/deployer.mjs` (new): `--check` (read-only: seed-derived dust/night addresses vs `.env`, direct Blockfrost GraphQL `dustGenerationStatus` + `block{height}`, proof-server probe, JSON out, funding-gate verdict) + `--deploy` (chain write: gate re-check, latest `.compile-out` resolution, WalletFacade + midnight-js providers, `deployContract`, indexer truth-gate; UNEXECUTED) | squad-f subagent | DONE (build only; `--check` run live, `--deploy` not run) | `scripts/deployer.mjs` (new), `docs/deployer.md` (new), `STATUS.md` (this row) | Funding gate currently **NO-GO**: `dustGenerationStatus` returns `registered:false` for the deployer's Cardano reward address (indexer height 3043041); proof server `127.0.0.1:6300` not running on this VM. Full wallet-SDK sync path prototyped then abandoned (hung against Blockfrost WS); `--check` uses direct GraphQL per coordinator order. `--deploy` needs explicit confirmation + gate GO + proof server + `COHORT_DEPLOYER_PS_PASSWORD`. |

## Integrator log
- 2026-10-19 ~05:05: scale-up received; STATUS.md created; token verified (44ch, chmod 600).
- wSex removed (commit d828db2); verifier SHA byte-identical (5af3b4b…).
- A1 (migration) running; narrowed scope sent (skip README curl, public-state logic, regression test).
- 2026-10-19 ~05:10: Wave 1 squads launched (7 workers): B1 contract author (52abe3ab, critical path), B2 ceremony (44ab66df), A5 regression test (ffb67c5f), D1 CT.gov catalog (acec6753), D2 Supabase (69379855), D4 wallet matrix (3567fb92), E2 deck outline (a6971dd1). Wave 2 (B3/B4/B5/B6/B7/B8, A7/A8, C1-C7, D3/D5, E1/E3) spawns on dependency clear.
- 2026-10-19 ~05:15: A5 DONE (77fb2ca, regression test fails-until-migration as designed); E2 DONE (6605830, deck outline). Spawned D3 FHIR (04eea10c), E1 video script (770bac1a). A1 mid-migration (15 files modified, uncommitted).
