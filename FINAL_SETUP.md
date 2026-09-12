# COHORT — FINAL_SETUP

Date: 2026-09-12

This is the single operator setup document. It describes what was actually built and tested. It does not claim 100% privacy or production-grade security.

Product sentence: **COHORT lets a user prove they qualify for a public clinical trial without sending their private medical facts to the COHORT server.**

---

## 1. Architecture

```
USER BROWSER
  ├── PUBLIC: ClinicalTrials typed subset (min/max age, sexCriterion, mapped flags)
  └── PRIVATE: age / condition / medication / optional FHIR  →  memory only
                    │
                    ▼
         Midnight wallet proving (1AM getProvingProvider / WASM)
                    │
                    ▼  proof + public outputs only
              Midnight network (Preview / Preprod / local undeployed)
                    │
                    ▼
         COHORT Render host: static UI + public API
              (trial metadata, health, public referral records)
```

One Node process serves `apps/web` and `apps/api`. There is no COHORT-hosted proof server. A remote proof server that receives patient facts is rejected as a production path.

## 2. Exact current stack versions

Pinned to the public-network compatibility matrix (Preview / Preprod / Mainnet). Do **not** mix Compact 0.34 / language 0.26 / ledger 9 / midnight-js 5.x (`unwrapV9`) with those networks.

| Component | Pin |
|---|---|
| Node.js | 22 (tested 22.23.2 in WSL Ubuntu) |
| Compact language | 0.23 |
| Compact compile | 0.31.1 |
| compact-runtime | 0.16.0 |
| Midnight.js | 4.1.1 |
| DApp Connector | 4.0.1 |
| Wallet SDK | 1.2.0 exact |
| Proof server image (user-local / Lace only) | `midnightntwrk/proof-server:8.1.0` |
| Public node | 1.0.2 |
| Indexer | Preview 4.3.5 / Preprod 4.3.3-hotfix |
| Ledger | 8.0 / on-chain runtime v3 |

Sources: [Midnight support matrix](https://docs.midnight.network/relnotes/support-matrix) and [networks](https://docs.midnight.network/guides/networks-and-environments).

## 3. Browser privacy architecture

- Private facts live in DOM/memory for the current page. They are not written to `localStorage`, `sessionStorage`, `indexedDB`, cookies, or the URL.
- FHIR paste is parsed in the browser. The parser (`TESTS/fixtures/normalize-fhir.mjs`) has no `fetch`.
- `app.js` only `fetch`es `/api/trials` and `/api/config`.
- Gold path will not invent a transaction if no DApp Connector is present, and will not send witnesses to Render if the wallet lacks `getProvingProvider`.

Residual: anything typed into the form is visible on the local device (DOM, accessibility tree, extensions). That is user-local, not COHORT-server.

## 4. Wallet / proving architecture

Verified against current Midnight docs (Kapa, 2026-09-12):

- **1AM** (`window.midnight['1am']`): in-browser WASM Halo2/BLS12-381, exposes `getProvingProvider`. Preferred patient path. Package: `@midnight-ntwrk/midnight-js-dapp-connector-proof-provider` with midnight-js **4.1.1** (not 5.x `unwrapV9`).
- **Lace** (`mnLace`): local proof-server `http://localhost:6300` only. No `getProvingProvider`. COHORT must not proxy that to Render.
- Official docs: there is **no public hosted proof server**. Proof-server is always local for Lace. 1AM may use vendor in-browser WASM (and documents a vendor “Proof Station”; that is 1AM’s process, not a COHORT server).

COHORT never hosts a proof server and never accepts private witnesses on `/api/referral`.

## 5. Backend responsibilities

`GET /health` `{ "status": "ok" }`  
`GET /api/config` public network metadata only  
`GET /api/trials` public typed trial subset  
`GET /api/public-state` public events (trialId, commitment, txHash, nullifier, contract, network)  
`POST /api/referral` public fields only  
Static UI from `apps/web`

Binds `0.0.0.0` and `process.env.PORT` for Render.

## 6. Prohibited backend data

Rejected with HTTP 400 (`PRIVATE_FIELD_REJECTED`):  
`age`, `ageYears`, `sex`, `diagnosis`, `condition`, `medication`, `fhir`, `witness`, `privateState`, `secret`, `blind`, `seed`, `mnemonic`, `patient`, `wAge`, `wCondition`, `wMedication`, `wSecret`, `wBlind`.

Also rejected in query strings. Unexpected keys outside the public referral allow-list are rejected.

## 7. Network endpoints

| Network | Node | Indexer | Proof |
|---|---|---|---|
| undeployed (local) | http://127.0.0.1:9944 | http://127.0.0.1:8088/api/v4/graphql | http://127.0.0.1:6300 (user machine) |
| preview | https://rpc.preview.midnight.network | https://indexer.preview.midnight.network/api/v4/graphql | local / wallet only |
| preprod | https://rpc.preprod.midnight.network | https://indexer.preprod.midnight.network/api/v4/graphql | local / wallet only |

## 8. Contract address

**Not deployed to Preview/Preprod/Mainnet in this session.** No funded public-testnet seed was present in gitignored env.

Local Compact circuit: `CONTRACT/cohort.compact`  
Generated JS: `packages/contract/managed/cohort/contract/`  
Prior local hello-world (undeployed lab, not COHORT): `84d9eb030adb40678c6e14d415544be1a3f6cff3757b5efed359dbdd54a4cc59`

## 9. Deployment information

- GitHub: https://github.com/Mr-Ben-dev/COHORT
- Render Free Web Service: **https://cohort-y4zr.onrender.com**
- Plan confirmed via API: `free`
- Service id: `srv-daibkpp594qs73836as0`
- `GET /health` on the public URL returned `{"status":"ok"}` after first deploy (`live`)
- Vercel token was **not** used (no `VITE_*` frontend secrets path)
- Circuit tests execute via compact-runtime 0.16.0 in Node. That is circuit semantics, not a mock chain transaction.

## 10. Render setup

Free web service only. Created with `serviceDetails.plan = "free"` (API default is `starter`; that paid default was not used).

- Runtime: Node 22
- Build: `npm install`
- Start: `node apps/api/src/server.mjs`
- Health: `/health`
- Region: oregon
- Blueprint: `render.yaml` (variable **names** / public URLs only — no secret values)

Same-origin browser calls to `https://cohort-y4zr.onrender.com` are allowed by Host matching. Cross-origin `https://evil.example` received 403.

## 11. Render Free limitations

- Spins down after idle; first request is a cold start (can be tens of seconds).
- No SLA, no always-on.
- Do not buy keep-alive. Do not upgrade the plan for this project unless explicitly instructed.
- Not suitable as a proof server (and COHORT must not use it as one).

## 12. Environment variables

See `.env.example`. Copy to `.env` locally. Never commit `.env`.

## 13. `.env.example` mapping

| Name | Role |
|---|---|
| NODE_ENV | PUBLIC_CONFIG |
| PORT | PUBLIC_CONFIG (Render sets this) |
| MIDNIGHT_NETWORK | PUBLIC_CONFIG |
| MIDNIGHT_INDEXER_URL | PUBLIC_CONFIG |
| MIDNIGHT_INDEXER_WS_URL | PUBLIC_CONFIG |
| MIDNIGHT_NODE_URL | PUBLIC_CONFIG |
| COHORT_CONTRACT_ADDRESS | PUBLIC_CONFIG |
| PUBLIC_APP_URL | PUBLIC_CONFIG |
| CORS_ORIGIN | PUBLIC_CONFIG |
| FHIR_PUBLIC_API_URL | PUBLIC_CONFIG (unused in gold path) |
| GITHUB_TOKEN | SERVER_SECRET — agent/CI only |
| RENDER_API_KEY | SERVER_SECRET — agent/CI only |
| VERCEL_API_TOKEN | SERVER_SECRET — unused |
| MIDNIGHT_PREPROD_SEED | WALLET_SECRET — local deploy only |

## 14. Which variables are public

Everything the browser receives from `/api/config`: network id, indexer/node URLs, contract address, proving-path labels. All `VITE_*` would be public; this app has **no** `VITE_*` variables.

## 15. Which variables are server-only

GitHub / Render / Vercel tokens, wallet seeds, private keys. The API process **does not load** those keys from `.env` (filtered in `loadEnv`). They must never be `VITE_*`.

## 16. Exact local setup commands

On Windows 11, compile Compact and run Midnight Node **in WSL2 Ubuntu**, not native Windows.

```bash
# WSL Ubuntu, Node 22
cd /path/to/COHORT
cp .env.example .env   # fill public URLs only; keep tokens out of git
npm install
npm test
npm start              # http://127.0.0.1:10000
```

Compact (already installed in this workspace): `compact compile --version` must print `0.31.1`.

## 17. Exact build commands

```bash
npm run build    # node apps/api/src/server.mjs --check
```

## 18. Exact test commands

```bash
npm test
npm run test:privacy
npm run test:e2e
npm audit --omit=dev
```

## 19. Exact E2E commands

```bash
npm run test:e2e
```

This is a Node HTTP intercept against the local origin (request/response URL, JSON, headers, cookies). It is **not** a live Chrome + 1AM click-path.

## 20. Exact Render deployment settings

Dashboard or API, **plan = free**:

- Repo: `https://github.com/Mr-Ben-dev/COHORT`
- Branch: `main`
- Runtime: Node
- Build command: `npm install`
- Start command: `node apps/api/src/server.mjs`
- Health check: `/health`
- Env: copy public rows from `.env.example`. Do not paste GitHub/Render/Vercel tokens into Render env unless you need them server-side (COHORT does not).

## 21. Exact Midnight testnet validation procedure

1. Fund a Preprod or Preview wallet (faucet). Keep the seed in gitignored `.env` only.
2. Run user-local proof-server `midnightntwrk/proof-server:8.1.0` **or** use 1AM in-browser proving.
3. Deploy `CONTRACT/cohort.compact` with midnight-js **4.1.1** (not 5.x).
4. Record contract address + deploy tx + indexer confirmation.
5. Set `COHORT_CONTRACT_ADDRESS` on Render (public).
6. Prove from 1AM; confirm `/api/referral` receives only `{ trialId, commitment, txHash, ... }`.

**This session did not complete steps 1–6** (no funded seed). Do not label COHORT as public-testnet deployed.

## 22. Privacy test methodology

- Compact-runtime: eligible / too young / too old / missing condition / excluded medication / replay / trial-scoped nullifiers / fresh vs reused blinds.
- Property: ages `{min-1, min, min+1, max-1, max, max+1}` × condition × medication.
- Backend schema gate + query-param gate.
- Differential: synthetic PATIENT_A (age 31, condition true, medication false) vs PATIENT_B (age 52, condition false, medication true). Recursive JSON inspection of API responses; exact markers `31` and `52` absent from backend responses.
- Adversarial: private POSTs share status 400 and body length; public POSTs 201 regardless of who the user is (server never sees eligibility).
- Log redaction unit tests; errors must not echo age, `Authorization`, or cookies.
- Source scan for live-looking token patterns; `.env` gitignored.
- FHIR: local fixture only.

Application-level automated testing found no private patient data returned by, or accepted into, the COHORT backend across the tested flows. That is not a cryptographic proof of zero leakage against wallets, CDNs, or browser extensions.

## 23. Threat model

In scope: COHORT HTTP API, static frontend, Compact public outputs, git/bundle secrets.

Out of scope / residual:

- 1AM or Lace internals and vendor telemetry
- Timing of in-browser proving
- User-device malware / malicious extensions
- Traffic analysis of Midnight tx metadata at network level
- Indexer operators
- Render platform logs of raw HTTP (mitigated by never sending private fields)
- Compact `disclose(nullifier)` and `disclose(referral)` — intentional public set membership

## 24. Known residual risks

1. `disclose(nul)` and `disclose(referral)` are public by design (replay protection / referral set). They must not encode raw age.
2. Reused `wBlind` collapses the referral set to one commitment — app mints `crypto.getRandomValues` blinds; users/scripts that reuse blinds can create linkage.
3. `wSex` is declared in Compact source but unused (compiler stripped it from generated witnesses).
4. 1AM “Proof Station” is vendor-side; COHORT does not call it, but we did not inspect 1AM’s binary.
5. No live wallet E2E in this session.
6. No public-testnet contract.
7. Credentials were pasted into this chat by the operator. **Rotate GitHub, Render, and Vercel tokens.** They were written only to gitignored `.env`, not to git, markdown, or frontend.
8. Network sniff used Node `fetch`, not Playwright Chromium (no service-worker/devtools capture).
9. Public trial `minAge`/`maxAge` are public policy, not patient age.

## 25. What was actually tested

29/29 Node tests passing (WSL Node 22.23.2): circuit A–I, property combinations, backend gate, privacy differential, e2e network sniff, headers/CORS/CSP, logging redaction, adversarial status-code oracle, secrets scan, build check. `npm audit --omit=dev`: 0 vulnerabilities.

Local hello-world deploy/prove on undeployed was completed in the earlier recon (not this COHORT contract on public nets).

## 26. What was NOT tested

- Live 1AM / Lace click-path
- Public Preview/Preprod COHORT deploy tx
- Playwright against a public Render origin (until URL exists)
- Render log scrape (platform UI)
- Timing side channels
- Mainnet
- Real PHI / real EHR
- Compact 0.34 / midnight-js 5.x (intentionally unused)

## 27. Final PASS/FAIL table

| Gate | Result |
|---|---|
| Contract compiles | PASS (0.31.1 artifacts in repo) |
| Unit tests | PASS 29/29 |
| Boundary tests | PASS |
| Negative tests | PASS |
| Replay protection | PASS |
| Nullifier separation | PASS |
| Commitment randomness | PASS (fresh distinct; reuse documented/fail) |
| Browser network privacy (local origin) | PASS |
| Backend rejection | PASS |
| Log privacy | PASS (unit + no body logging) |
| Error privacy | PASS |
| FHIR privacy | PASS (local only) |
| Multi-user isolation | PASS (public events only) |
| CORS | PASS |
| Security headers | PASS |
| Production build check | PASS |
| No secrets in bundle | PASS |
| No secrets in git history | PASS if `.env` stays untracked (verify after commit) |
| Public testnet transaction | FAIL |
| Public indexer confirmation | FAIL |
| Wallet flow | FAIL (not executed live) |
| Real frontend + wallet gold path | FAIL (UI present; wallet not connected) |
| Render Free deploy | PASS (`plan=free`, `https://cohort-y4zr.onrender.com`) |
| Render `/health` | PASS `{"status":"ok"}` |
| Render public API privacy re-test | PASS (private POST 400, no age echo; trials JSON has no 31/52; config has no token prefixes; evil Origin 403) |
| Render cold start | NOT TESTED (idle wait not performed; do not run a keep-alive pinger) |
| Public app, second user | NOT TESTED (no second browser profile / wallet) |
| No private fact to COHORT backend | PASS (tested paths) |
| No fake chain tx in gold path | PASS |
| No mock proving in gold path | PASS |

**READY for public-testnet “production deployed” label: NO.**  
**READY as a public Render Free host with honest wallet gating and a privacy-gated API: YES, with the residual risks in §24.**

## 28. Reproducible clean-machine setup

1. Windows 11 + WSL2 Ubuntu 24.04 + Docker Desktop.
2. In WSL: Node 22 via nvm. Do not use Windows Node 24 for Midnight.
3. Install Compact 0.31.1 (`compact update 0.31.1`). `compact update` with no version installs 0.34 — do not do that for public nets.
4. Clone this repo. `cp .env.example .env`.
5. `npm install && npm test && npm start`.
6. Optional local chain: midnight-local-dev standalone + proof-server 8.1.0 on localhost:6300 for Lace.
7. Patient demo: Chrome + 1AM extension; never point proving at COHORT/Render.

---

Language used in this document is evidence-backed. Application-level automated testing found no private patient data transmitted to the COHORT backend across the tested user flows. Residual risks above remain.
