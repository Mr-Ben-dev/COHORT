# COHORT — Final Honest Calibration (2026-10-19)

**Method:** scored against the official 40/15/15/15/10/5 rubric with
on-disk evidence per criterion. No inflation. Every claim traces to a file,
commit, or measured run. Written BEFORE the Preprod contract deploy —
the deploy moves Product/Communication up when its tx hashes land.

## Engineering & Implementation (40%): 34/40 → 8.5/10

**Evidence:**
- 5 circuits compile full-ZK on pinned compactc 0.31.1/language 0.23
  (`scripts/compile-contract.mjs`, exit 0; `CONTRACT/cohort.compact`).
- Verifier SHAs recorded (`docs/verifier-keys.md`): `proveEligible`
  `5af3b4b2…` byte-identical to the Wave-1 pin; 4 new circuits pinned.
- Dual-ledger discipline: `persistentCommit` attestations, program-scoped
  nullifiers (`(trial, attestation)`), `disclose()`-only public outputs.
- Hash-native issuer attestation (no `jubjubSchnorrVerify` — empirically
  proven absent on 0.31.x, design corrected before build).
- Blockfrost migration repo-wide with regression test
  (`TESTS/no-dead-indexer.test.mjs`); token via `?project_id=` (header auth
  404s — verified live).
- `midnightntwrk` topic + Apache-2.0 on repo.

**Deductions:** new circuits undeployed (no Preprod tx yet); proof-server
proving time unmeasured on this VM (harness exists,
`scripts/measure-proving.mjs`).

## QA & Reliability (15%): 13/15 → 8.5/10

**Evidence:**
- Full suite: **225 tests, 222 pass, 0 fail, 3 skipped** (2026-10-19,
  `node --test` with BLOCKFROST_PROJECT_ID set; the 3 skips are
  Playwright browser tests — VM egress proxy breaks their TLS).
- Refusal/adversarial tests for every new circuit; privacy tests;
  no-dead-URL regression test; truth-gate tests.
- Every tx-hash claim truth-gated by policy (29 `[FILL AFTER DEPLOY]`
  markers, none filled prematurely).

**Deductions:** browser (Playwright) tests skip in this VM (egress-proxy
TLS interception — environmental, documented with proof).

## Product & Vision (15%): 11/15 → 7.5/10

**Evidence:**
- One-liner: "Prove you qualify for a clinical trial without handing over
  your medical record."
- Real problem with cited crisis numbers (`DOMAIN-RESEARCH.md`, 45 sources).
- Real data anchor: ClinicalTrials.gov API v2, 12 hand-mapped trials.
- Hero delta closes Wave-1's #1 confessed gap (self-attested → issuer-attested).
- Health lane is open (both Wave-1 health projects scored 0).

**Deductions:** hero contract not yet deployed (the delta is code+proofs,
not yet on-chain); no pilot user.

## UX & Design (15%): 12/15 → 8.0/10

**Evidence:**
- Live site + API (both verified HTTP 200).
- No-wallet read path with honest live/sample provenance badges.
- Two-tier demo (in-browser simulator + wallet).
- FHIR/Synthea synthetic-record import (first on Midnight health).
- Site verification console; GeroWallet primary + 1AM fallback.
- Light clinical design (no cyberpunk).

**Deductions:** site console lacks the paste-tx-hash operator confirmation
flow (shipped counters/events only).

## Communication (10%): 7/10 → 7.0/10

**Evidence:**
- Video script (≤4 min, mission in 30s), deck outline (real numbers only),
  what-changed + submission pack drafts — all with honest `[FILL AFTER
  DEPLOY]` markers, zero invented hashes.
- Honest non-claims section + tests.

**Deductions:** video not shot; deck not finalized; markers unfilled
(blocked on deploy).

## Business Dev & Viability (5%): 2/5 → 4.0/10

**Evidence:** 7 named candidate first users (CISCRP, Antidote, TrialX, NORD,
Lazarex, ResearchMatch, ClinicalTrials.gov) — candidates only, zero contact.

**Deductions:** no pilot conversation, no named committed user. This is the
ceiling on 9.0.

## Total: 79/100 → **7.9/10**

**After the Preprod deploy** (contract address + ceremony txs truth-gated,
markers filled, video shot): Engineering 36, QA 12.5, Product 13, UX 12.5,
Communication 8.5, BD 2 → **84.5/100 ≈ 8.5/10** (the plan's stated ceiling).

**To 9.0+:** needs a real pilot conversation with a named trial org
(CISCRP/Antidote) — only the owner can open that door.
