# COHORT Wave-3 Plan Audit — execution vs `COHORT-WAVE3-PLAN.md`

**Auditor:** plan-audit worker (2026-10-19 ~07:30 EEST)
**Scope:** working tree `~/workspace/cohort-build` (119 commits), read-only audit — no pushes, no deploys, no chain writes.
**Method:** every item judged DONE only with on-disk evidence (file + commit SHA). No credit for plans, scripts that never ran, or docs that say "will".
**Plan source:** `~/workspace/cohort-wave2/COHORT-WAVE3-PLAN.md` (incl. Appendix A, Appendix B → `INTEGRATIONS.md`, and the 2026-10-19 CORRECTION on `jubjubSchnorrVerify`).

## Summary counts

| Status | Count |
|---|---|
| DONE (on-disk evidence) | 25 |
| PARTIAL (built but incomplete, or blocked on an external gate) | 7 |
| OPEN (no evidence / owner action required) | 6 |

### The 3 most important OPEN items
1. **Phase 2 gate: new contract NOT deployed on Preprod** — `scripts/deployer.mjs --deploy` exists but was never executed (commit `b565f90`, "unexecuted"). Funding gate is NO-GO: the deployer's Cardano reward address is not registered for DUST generation (`docs/deployer.md`, STATUS.md 06:55 EEST). The hero delta (attest/proveAttested) has zero on-chain evidence; verifier SHAs are recorded but marked "Undeployed" (`docs/verifier-keys.md`). Blocked on: owner faucet/DUST registration (human captcha), a running proof server, explicit owner confirmation. **Owner: the owner.**
2. **Measured proof-server run (Phase 2, closes the RESULTS.md open item)** — honestly unmeasured. `docs/proof-server-measurements.md` states plainly: "Real ZK proving time was NOT measured in this environment — no proof server exists here." Rerunnable harness `scripts/measure-proving.mjs` exists; the pinned expectation is `midnightntwrk/proof-server:8.1.0` (note: the plan said 8.1.3 — see §Deviations). **Owner: the owner** (needs a proof-server environment).
3. **Phase 6 human-door prep (pilot brief + 5-min demo script + single ask)** — no brief or demo-script file exists. Candidates (CISCRP, Antidote, TrialX, NORD, Lazarex, ResearchMatch, ClinicalTrials.gov) are named only in `docs/deck-outline.md` and `docs/video-script.md`, framed as candidates. The outreach itself is owner-led by plan; but the *prepared here* half is OPEN. This is the only route from BD 6.0 → 8.0 and the plan's only route to 9.0. **Owner: the owner** (with agent drafting the brief/script).

---

## Phase 0 — Secrets & setup (owner)

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| Fill `env.template` REQUIRED keys (`BLOCKFROST_PROJECT_ID`, `GITHUB_TOKEN`, `RENDER_API_KEY`, `VERCEL_TOKEN`) | OPEN | `~/workspace/cohort-wave2/env.template` exists; nothing in the tree shows the owner filled the real secrets. The run's own token (integrator log: "token verified (44ch, chmod 600)") is not the owner's filled template. | owner |
| Git identity `user.name "mr ben dev"` | DONE | `git config user.name` → `mr ben dev` | — |

## Phase 1 — Resurrection

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| 1. Blockfrost migration everywhere (API, dapp, web, `render.yaml`, `.env.example`, README curls; token via env, never committed) | DONE | `render.yaml` (Blockfrost URLs, `BLOCKFROST_PROJECT_ID` env key), `.env.example` (placeholder, no token), `apps/api/src/blockfrost-live.mjs` (`/api/public-state` live counters), `packages/dapp/src/blockfrost.mjs` (dapp defaults), web same-origin proxy routes for `/api/public-state` + `/api/attestation-counters`, README Blockfrost curl verification. Commits: `2ca0488`, `366ed25`, `dafd4c0`, `b6c85fc` | — |
| 2. Re-pin toolchain: `compact update 0.31`, midnight-js ≥ v4.0.2, proof-server 8.1.3; full recompile of `proveEligible`, verifier byte-identical or diff documented | PARTIAL | `compactc 0.31.1` / language 0.23 / runtime 0.16.0: `packages/contract/zk/compiler/contract-info.json` (commit `451d503`). `midnight-js 4.1.1` ≥ 4.0.2: root `package.json`. `proveEligible` verifier SHA-256 `5af3b4b2…` measured == Wave-1 pin: `docs/verifier-keys.md` (commits `2016b45`, `dc97e10`). **Gap:** proof-server standardized on `8.1.0`, not the plan's 8.1.3 (see §Deviations); no measured run (see Phase 2 item). | owner (needs proof-server env) |
| 3. Kill dead witness `wSex()` | DONE | Commit `d828db2` "Remove dead witness wSex from cohort.compact"; zero occurrences in `CONTRACT/cohort.compact` | — |
| 4. Keep-alive: 10-min ping cron + honest loading states in frontend | PARTIAL | `scripts/keepalive.mjs` + `docs/keepalive.md` (commit `b6c85fc`); honest loading states shipped in the same commit. **Gap:** the cron is not scheduled anywhere verifiable — no crontab entry, no GitHub workflow, no scheduler config references it (only `scripts/keepalive.mjs` matches in the tree). Judges will still hit a cold start until someone schedules it. | owner (schedule on an always-on machine) |
| 5. Fix `/api/public-state`: live ledger counters from Blockfrost (was `events: []`) | DONE | `apps/api/src/blockfrost-live.mjs` (GraphQL reads of `spent`/`referrals`/`proven`; Wave-3 counters return null with explicit `not-deployed` label pre-deploy — no invention). Commit `366ed25` | — |
| 6. Gate: `npm run compile && npm test && npm run judge:verify` green; README curls work against Blockfrost | PARTIAL | `npm run compile` (full-ZK, exit 0) and `npm test` exist; full suite: 244 tests, 224 pass, 17 fail, 3 skipped (STATUS.md ~07:15 EEST — all 17 failures are Playwright browser tests hitting the live Vercel URL with `net::ERR_CERT_AUTHORITY_INVALID`, egress-proxy TLS interception, i.e. environmental; zero non-browser failures). `scripts/judge-verify.mjs` exists and CI runs it (`.github/workflows/test.yml`). **Gap:** gate not fully green, and `judge-verify.mjs` carries stale lines (see §Deviations). | integrator (re-run on a clean network; fix stale check text) |

## Phase 2 — Hero: issuer-attested eligibility

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| On-chain set `attestations: Set<Bytes<32>>` + issuer-gated `attest(attestation)` circuit | DONE | `CONTRACT/cohort.compact:16` (ledger), `:117` (`attest` asserts issuer identity + inserts; rejects duplicates). Commits `451d503`, `9b4a196` | — |
| `attestationOf` = `persistentCommit` over (attributesHash, holderBinding), computed off-chain by demo issuer | DONE | `CONTRACT/cohort.compact:86-104` (`attestationOf(age, cond, med, holderSecret, nonce)`); no signatures in-circuit | — |
| `proveAttested(...)`: recompute commitment in-circuit, assert membership, run typed eligibility predicate over attested attributes, program-scoped nullifier | DONE | `CONTRACT/cohort.compact:141-176` (membership assert + `(trial, attestation)` nullifier preventing reuse across trials); refusal paths tested | — |
| CORRECTION honored: no `jubjubSchnorrVerify`; hash-native design that compiles on compactc 0.31.x / language 0.23 | DONE | Zero occurrences of `jubjubSchnorrVerify` in the tree; full-ZK compile exit 0 on 0.31.1/0.23 (`packages/contract/zk/compiler/contract-info.json`, `docs/verifier-keys.md`) | — |
| Demo issuer key ceremony, honestly labeled (demo issuer, not a hospital) | DONE | `scripts/issuer-ceremony.mjs`; commit `e4bfec7` ("ISSUER_ID pinned, judge credentials issued"); `TESTS/judge-credentials/judge1.json`; `initIssuer(id)` circuit installs the issuer identity on-chain (`CONTRACT/cohort.compact:35`) | — |
| Full-ZK compile; all verifier SHA-256 recorded | DONE | `docs/verifier-keys.md`: 5 circuits (`proveEligible 5af3b4b2…`, `attest 9819eb36…`, `attestWithAttributes cbd12106…`, `proveAttested a4571295…`, `initIssuer 80df3538…`); pins mirrored in `scripts/judge-pins.mjs` (`verifyAllVerifierKeys()`). Commits `2016b45`, `dc97e10` | — |
| Simulator + refusal tests (unattested attributes, tampered attributes, replayed attestation, wrong issuer) | DONE | `TESTS/attest-happy.test.mjs`, `TESTS/attest-adversarial.test.mjs` (commit `10f2f7b`); `TESTS/circuit-lib.mjs` witnesses `wHolderSecret/wNonce/wIssuerSecret` (commit `3685ab5`); all registered in `npm test` (commit `6101bbe`) | — |
| Measured proof-server run (close the RESULTS.md open item) | OPEN | `docs/proof-server-measurements.md` honestly states Layer 1 AND Layer 2 unexecuted ("no proof server exists here"); nothing invented. Harness `scripts/measure-proving.mjs` is rerunnable (commit `1a75519`) | owner (proof-server env) |
| **Gate:** new contract deployed on Preprod, explorer-verified txs, verifier SHA-256 recorded | OPEN | `scripts/deployer.mjs` `--check` (read-only) built and run; `--deploy` **unexecuted** (commit `b565f90`); `docs/verifier-keys.md` marks all four new circuits "Undeployed — no chain writes in this run"; `[FILL AFTER DEPLOY]` markers honestly unfilled everywhere (29 markers, §Honesty). Funding gate NO-GO per `docs/deployer.md` | owner (DUST registration, proof server, explicit confirmation) |

## Phase 3 — Site verification console

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| Research site confirms a public proof from **trial id + tx hash** against the Blockfrost indexer; no inbox, no PHI | PARTIAL | `/sites` UI shipped: `web/src/app/sites/page.tsx` + `_components/{site-console,counters-panel,trial-events,attestation-explainer,provenance-badge}.tsx` (commit `e03a8ec`); live counters via `web/src/lib/cohort-verify.mjs` with honest `live-onchain`/`sample-data` provenance (C2); same-origin `/api/public-state` + `/api/attestation-counters` proxy routes added (commit `dafd4c0`, fixing the 404 seam STATUS.md flagged). **Gap:** no operator form to paste trial id + tx hash and get an indexer confirmation — the console displays catalog trial events and counters, but the paste-to-confirm workflow is not implemented. | integrator |

## Phase 4 — Trial catalog 2 → 12

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| Hand-map 10 more real recruiting trials from ClinicalTrials.gov API v2 into the typed subset, with honest scoping disclaimers | DONE | 12 trials in `apps/api/src/trials.mjs` (NCT04200963, NCT04516057, NCT04977076, NCT05565833, NCT06165419, NCT06296745, NCT06304857, NCT06643819, NCT06804122, NCT06976619, NCT07153614, NCT07233434), each with typed flags + `unsupported[]` list + verbatim `provenance`; raw audit snapshots in `data/ctgov/`; human-verified extraction helper `scripts/ctgov-extract.mjs`; tests `TESTS/trials-catalog.test.mjs`. SQUAD D1 (`acec6753`) | — |

## Phase 5 — Communication

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| Video re-recorded ≤ 4 min (mission in first 30s, new delta on screen, zero jargon) | OPEN | `docs/video-script.md` only (E1, commit `179b425`) — a script with honest `[FILL AFTER DEPLOY]` beats, not a recording | owner (records) |
| Real deck (not a loseable Google Slides link) | PARTIAL | `docs/deck-outline.md` only (E2, commit `6605830`) — sourced outline; no deck artifact (no pdf/pptx/key) in the tree | owner (builds the deck) |
| README Wave-3 section + "what changed since Wave 1" with only new tx hashes | DONE | `README.md` §25 "Wave 3 — planned"; `docs/what-changed.md` (E3); `docs/honest-non-claims.md` + pinning tests (commit `b115ca1`, `TESTS/non-claims.test.mjs`); old hashes not presented as new; unfilled items honestly `[FILL AFTER DEPLOY]` | — |
| Submission pack: copy-paste-ready Akindo fields (owner submits himself) | PARTIAL | `docs/submission-pack-draft.md` (E3) — structured draft with `[FILL AFTER DEPLOY]` placeholders for video URL, contract address, ceremony txs | owner (fills + submits) |
| `NEXT_PUBLIC_*` discipline (verify env `updatedAt` < build time after any Vercel env change) | DONE | Documented in `README.md` (grep: NEXT_PUBLIC discipline present) | — |

## Phase 6 — The human door (owner-led; prepared here)

| Plan item | Status | Evidence | Owner if OPEN |
|---|---|---|---|
| One-page pilot brief + 5-minute demo script + single ask (30-min conversation) prepared; outreach by owner; zero contact claimed | OPEN | No `docs/pilot-brief.md` or org-demo-script file exists. Candidates (CISCRP, Antidote, TrialX, NORD, Lazarex, ResearchMatch, ClinicalTrials.gov) appear only in `docs/deck-outline.md` and `docs/video-script.md`, framed as candidates-only — honest, but not the prepared brief/script/ask. | owner (outreach + brief approval) |

---

## Kill list — compliance

| Kill-list item | Status | Evidence |
|---|---|---|
| No escrowed referral marketplace (honestly not-live) | HONORED | No marketplace built; no coin-holding circuit. Matches are references in killed/resear
...[truncated 5712 chars]
---

## Addendum — 2026-10-19 ~09:00 EEST (owner: "make COHORT complete, take your time")

**Deployer hardenings (all committed + pushed as "mr ben dev"):**
- `COHORT_DEPLOY_BYPASS_GENERATION_FLAG=1` now actually implemented (was documented in runbook but never coded). Skips only the generation-registration gate; wallet sync still proves real spendable balance.
- Sync timeout: `COHORT_SYNC_TIMEOUT_MS` (default 10m) — fails fast instead of hanging forever.
- Fixed `loadGeneratedContract` circuit check for compactc 0.31.x (circuits on instance, not prototype).
- New: `scripts/swap-contract-address.mjs` — one-command rotation of the contract address across all 10 wired files post-deploy.

**Contract deploy status:** Attempted 3x from this VM. WSS fixed (Node 24 native WebSocket + NODE_USE_ENV_PROXY), proof server running (8.1.0 via system ld-linux), contract recompiled (verifier 5af3b4b2… byte-identical). **Hard limit:** `WalletFacade.waitForSyncedState()` cannot complete here — times out after 10 min. Raw WSS + graphql-ws work; the SDK's full sync hangs. Deploy remains the ONE laptop step per `docs/owner-deploy-runbook.md`.

**Tests re-run 2026-10-19 ~08:55:** 223 pass, 0 fail (non-browser), 4 skipped. Browser tests excluded (VM TLS).

**Deployments verified live:** Render API `cohort-y4zr.onrender.com` → `{"status":"ok"}`; Vercel production `cohort-web-orcin.vercel.app` → HTTP 200.

**Phase 6:** DONE (pilot-brief.md + demo-script-5min.md, commit f516db3).
