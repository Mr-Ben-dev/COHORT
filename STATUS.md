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
| `web/src/app/sites/*` (new) | SQUAD D (console worker) |
| `packages/dapp/src/wallet/*` | SQUAD D (wallet worker) |
| `RESEARCH/fhir-spike.md` (new) | SQUAD D (FHIR worker) |
| `docs/video-script.md`, `docs/deck-outline.md`, `docs/what-changed.md`, `docs/submission-pack.md` (new) | SQUAD E |

## SQUAD A — Resurrection
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| A1 | apps/api + packages/dapp + web lib + render.yaml + .env.example URL migration (SKIP: README curl, public-state logic, regression test) | c35f510a (running) | RUNNING | see ownership map | — |
| A5 | Repo-wide dead-URL regression test (`TESTS/no-dead-indexer.test.mjs` + register in package.json) | regression worker | DONE | `TESTS/no-dead-indexer.test.mjs` (new, committed 77fb2ca), root `package.json` test script | fails until A1 migration lands (expected — 8 live files still reference dead hosts, see report) |
| A6 | Toolchain re-pin + recompile + verifier SHA | integrator (done) | DONE | CONTRACT/cohort.compact (wSex removed, SHA byte-identical) | — |
| A7 | `/api/public-state` live counters via Blockfrost GraphQL (after A1 finishes server.mjs) | — | NOT STARTED | apps/api/src/server.mjs | waits for A1 |
| A8 | Keep-alive + loading states + README curl fixes (after A1 finishes README) | — | NOT STARTED | README.md, web components | waits for A1 |

## SQUAD B — Hero circuit (hash-native)
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| B1 | Contract author: attestations Set, attest(), attestWithAttributes(), proveAttested(), attestationOf(), ISSUER_ID (interface spec in section below) | af979b4e (B1) | DONE | CONTRACT/cohort.compact | none — see deviations in interface spec |
| B2 | Demo issuer key-ceremony script | 44ab66df | RUNNING — script written + tested (clean exit 2 pre-B1); polling for B1 interface | scripts/issuer-ceremony.mjs (new), .gitignore (+scripts/.issuer-secret.json) | B1 contract interface (issuerIdOf/attestationOf/ISSUER_ID placeholder not yet in contract) |
| B3 | Simulator happy-path tests | — | NOT STARTED | TESTS/attest-happy.test.mjs | waits for B1 |
| B4 | Refusal/adversarial tests | — | NOT STARTED | TESTS/attest-adversarial.test.mjs | waits for B1 |
| B5 | Full-ZK compile + verifier SHA record + pins update | — | NOT STARTED | scripts/ | waits for B1 |
| B6 | Proof-server measurement | — | NOT STARTED | — | waits for B5 |
| B7 | dapp wiring for new circuits | — | NOT STARTED | packages/dapp/src/attest.mjs (new) | waits for B1 |
| B8 | Circuit documentation | — | NOT STARTED | docs/circuits.md (new) | waits for B1 |

### B1 contract interface (binding) — AS IMPLEMENTED 2026-10-19 ~05:30 EEST
```compact
witness wHolderSecret(): Bytes<32>;
witness wNonce(): Bytes<32>;
witness wIssuerSecret(): Bytes<32>;
// ISSUER_ID lives in circuit issuerId(): Bytes<32> (see deviations); zeros placeholder, ceremony-replaced
export ledger attestations: Set<Bytes<32>>;
export ledger attestationsVerified: Counter;
export circuit attestationOf(age: Uint<8>, cond: Boolean, med: Boolean, holderSecret: Bytes<32>, nonce: Bytes<32>): Bytes<32>
export circuit issuerIdOf(secret: Bytes<32>): Bytes<32>   // ceremony helper: returns disclose(secret)
export circuit attest(attestation: Bytes<32>): Boolean  // assert(disclose(wIssuerSecret())==issuerId()); replay-check; insert
export circuit attestWithAttributes(age: Uint<8>, cond: Boolean, med: Boolean, holderSecret: Bytes<32>, nonce: Bytes<32>): Boolean  // issuer-gated, computes attestationOf in-circuit
export circuit proveAttested(trialId: Bytes<32>, minAge: Uint<8>, maxAge: Uint<8>, requireCondition: Boolean, forbidMedication: Boolean): Boolean
```
attestationOf logic: `attrsHash=persistentHash<[Bytes<32>,Uint<8>,Boolean,Boolean]>([pad(32,"cohort:attrs"),age,cond,med])`; `binding=persistentHash<[Bytes<32>,Bytes<32>,Bytes<32>]>([pad(32,"cohort:holder"),holderSecret,nonce])`; return `persistentCommit<Bytes<32>>(attrsHash,binding)`. proveAttested: recompute attestation from wAge()/wCondition()/wMedication()/wHolderSecret()/wNonce(), assert member, program-scoped nullifier `persistentHash<Vector<3,Bytes<32>>>([pad(32,"cohort:attnul"),trialId,disclose(att)])`, same predicate asserts as proveEligible, referral as proveEligible, proven++, attestationsVerified++. proveEligible + trialNullifier byte-identical to deployed version (verified by diff). Full contract compiles on compactc 0.31.1 (typecheck + TS codegen OK; full-ZK proving-key run in progress at B1 finish).

#### Deviations from the draft spec (B2/B3/B7 read this)
1. `const ISSUER_ID: Bytes<32> = 0x...` does NOT compile on language 0.23: `const` is not a top-level keyword, and `0x`-hex literals parse as Uint (capped at Uint<248>) — never Bytes<32>. Replaced with `circuit issuerId(): Bytes<32>` whose body is the 32-byte placeholder string `"\x00...\x00"` (32 escapes). The ceremony worker replaces the single marked line (`// CEREMONY-REPLACE: ISSUER_ID_BYTES`) with 32 `\xNN` escapes — `\xNN` escapes in string literals ARE the codegen vehicle for arbitrary 32-byte constants (verified compiling).
2. `disclose(x)` is a compiler permission marker, NOT a bytes conversion: it is the identity at the value level (`disclose(Uint<248>)` typechecks as Uint<248>; `disclose(age)` with `age: Uint<8>` is Uint<8> and fails as a `Vector<N, Bytes<32>>` element). So attestationOf hashes typed tuples (see logic above) instead of `disclose()`-converted elements. Off-chain recomputation must use the tuple construction, or simply call `attestationOf` / use `attestWithAttributes` (preferred — no off-chain hash agreement needed).
3. OBSERVATION for integrator/B2 (not changed — interface is binding): because disclose() is the identity, `issuerIdOf(secret)` returns the 32 secret bytes unchanged, and the baked-in ISSUER_ID equals the raw issuer secret bytes. Post-ceremony the "secret" is readable from the contract source/compiled circuit — the issuer gate is demo-grade (knowledge of the pre-ceremony secret), not a cryptographic secret. If Wave-3 judging needs a real secret, the issuer check must move to a hash preimage (e.g. `persistentHash` of the secret) — that is a spec change for the parent/integrator to approve.

## SQUAD C — Integration layer
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| C1 | Truth gate: poll Blockfrost for ledger effect before UI success | — | NOT STARTED | packages/dapp/src/truth-gate.mjs (new) | token in .env |
| C2 | No-wallet read path + live/sample badges (site console reads via same-origin proxy) | — | NOT STARTED | web/src/app/verify/* (new) | A7 (public-state) |
| C3 | Two-tier demo: in-browser simulator tier + wallet tier | — | NOT STARTED | web/src/app/demo/* (new) | B1 (contract) |
| C4 | Proof-of-execution counter wiring (attestationsVerified → API → UI) | — | NOT STARTED | apps/api, web | B1, A7 |
| C5 | Judge credential files + try-it-yourself doc | — | NOT STARTED | TESTS/judge-credentials/, docs/try-it.md | B2 (ceremony) |
| C6 | managed/ commit verification + CI green | — | NOT STARTED | .github/ | — |
| C7 | Honest non-claims README section + pinning tests | — | NOT STARTED | README.md, TESTS/non-claims.test.mjs | waits for A8 |

## SQUAD D — Product depth
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| D1 | Trial catalog 2→12 hand-mapped | — | NOT STARTED | apps/api/src/trials.mjs | — |
| D2 | Site verification console | — | NOT STARTED | web/src/app/sites/* (new) | C2, A7 |
| D3 | Wallet matrix (Lace primary investigation + code) | — | NOT STARTED | packages/dapp/src/wallet/* | — |
| D4 | Wallet matrix: GeroWallet primary, 1AM fallback, Lace flagged `proving:false` (code + web research, no pushes/deploys/chain writes) | d4 subagent | DONE | packages/dapp/src/wallets.mjs (new), docs/wallet-trust.md (new), docs/wallet-demo-checklist.md (new), TESTS/wallet-matrix.test.mjs (new, in test script), web copy: wallet-picker.tsx, wallet-modal.tsx, package.json | A1 concurrently editing packages/dapp/src — new file only, no edits to existing .mjs files |

## SQUAD E — Communication
| # | Task | Worker | Status | Files touched | Blockers |
|---|---|---|---|---|---|
| E1 | Video script ≤4min (mission in first 30s, new delta on screen) | SQUAD E | DONE | docs/video-script.md (new, committed 179b425) | tx hashes/addresses marked [FILL AFTER DEPLOY]; blockers cleared — script works on simulator tier if deploy misses shoot day |
| E2 | Deck outline (real numbers only, sourced) | — | DONE | docs/deck-outline.md (new) | DOMAIN-RESEARCH.md |
| E3 | What-changed + submission pack draft (new hashes only when available) | — | NOT STARTED | docs/what-changed.md, docs/submission-pack.md | B5 (new SHAs) |

## Integrator log
- 2026-10-19 ~05:05: scale-up received; STATUS.md created; token verified (44ch, chmod 600).
- wSex removed (commit d828db2); verifier SHA byte-identical (5af3b4b…).
- A1 (migration) running; narrowed scope sent (skip README curl, public-state logic, regression test).
- 2026-10-19 ~05:10: Wave 1 squads launched (7 workers): B1 contract author (52abe3ab, critical path), B2 ceremony (44ab66df), A5 regression test (ffb67c5f), D1 CT.gov catalog (acec6753), D2 Supabase (69379855), D4 wallet matrix (3567fb92), E2 deck outline (a6971dd1). Wave 2 (B3/B4/B5/B6/B7/B8, A7/A8, C1-C7, D3/D5, E1/E3) spawns on dependency clear.
- 2026-10-19 ~05:15: A5 DONE (77fb2ca, regression test fails-until-migration as designed); E2 DONE (6605830, deck outline). Spawned D3 FHIR (04eea10c), E1 video script (770bac1a). A1 mid-migration (15 files modified, uncommitted).
