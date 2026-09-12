# FINAL_FEASIBILITY

Date: 2026-09-12
Machine: Windows 11 + WSL2 Ubuntu 24.04.3 + Docker Desktop 4.89
Kapa: queried. Compiler: ran. Local network: probed. Runtime tests: ran. Hello-world **deployed and called** on undeployed (`84d9eb03…`). Browser wallet: not clicked. COHORT proof-server prove: not yet.

## 1. Can COHORT be built?

**YES, with a bounded MVP.** Privacy core compiles and executes on Compact 0.31.1 / ledger 8. Full protocol text, live escrow, issuer-attested FHIR, and Mainnet ship are not Wave 1.

## 2–10. Exact stack

| # | Piece | Pin |
|---|---|---|
| 2 | Midnight stack | Ledger **8.0** public (local node image 1.0.0 / RPC name `undeployed1`) |
| 3 | Compact compile | **0.31.1** |
| 3b | Compact language | **0.23** (`pragma language_version 0.23`) |
| 4 | Ledger | **8.0** |
| 5 | Node | Public **1.0.2**; local Docker **1.0.0** |
| 6 | Midnight.js | **4.1.1** |
| 7 | Wallet SDK | **1.2.0 exact** (npm latest is 1.1.0) |
| 8 | DApp Connector | **4.0.1** |
| 9 | Indexer | Preview **4.3.5**; Preprod/Mainnet **4.3.3-hotfix**; local **4.3.3** |
| 10 | Proof server | **`midnightntwrk/proof-server:8.1.0`** (this PC `/version` = 8.1.0) |

Compact runtime **0.16.0**. Compact JS 2.5.1 / Platform JS 2.2.4 / on-chain runtime 3.0.0 per matrix.

## 11–14. Windows

11. Windows works **via WSL2**, not native Compact.
12. WSL2 required: **YES**.
13. Docker required: **YES** for proof-server and local node/indexer. 1AM can prove in-browser for a patient demo.
14. Repo should live on the **Linux filesystem** (`/home/devmo/cohort-work`). Cursor copy on `D:\route\midnight\COHORT` is fine; compile from Linux.

## 15. How we compile

```
export PATH="$HOME/.local/bin:$HOME/.compact/bin:$PATH"
compact update 0.31.1
compact compile contract.compact managed/name
```

Verified on this PC.

## 16. Local network

`midnight-local-dev/standalone.yml`: node 9944, indexer 8088, proof-server 6300.
This PC: all three up. `system_chain=undeployed1`, indexer height 2, proof health ok.

## 17. How we prove

HTTP proof-server `127.0.0.1:6300` (Lace) or wallet `getProvingProvider` (1AM).
Hello-world prove+deploy measured: deploy **21.8 s**, storeMessage **17.2 s** via proof-server 8.1.0. COHORT `proveEligible` prove time still unmeasured. Circuit **execution** for COHORT measured via compact-runtime 0.16.0.

## 18. Wallet

Feature-detect. Patient: 1AM. Site/CI: Wallet SDK 1.2.0 + local proof-server. Lace fallback if Docker is running. No `signData` requirement.

## 19. Undeployed deploy

**Done.** `MIDNIGHT_NETWORK=local yarn test` against midnight-js **4.1.1** + genesis seed `00…01`. Contract address `84d9eb030adb40678c6e14d415544be1a3f6cff3757b5efed359dbdd54a4cc59`. SDK network id `undeployed` worked even though `system_chain` is `undeployed1`.

## 20. Preview

`setNetworkId('preview')`, RPC/indexer preview endpoints, **local** proof-server, faucet tNIGHT, wait DUST. Not funded this session. RPC live (`Midnight Preview`, height 826019).

## 21. Preprod

Same pattern, preprod endpoints, faucet. RPC live (height 2510191).

## 22. Mainnet

RPC live (height 2542478). Real NIGHT/DUST, no faucet. Deploy authorization **UNKNOWN**. No address. Treat as **CONDITIONAL / not this wave** unless Foundation says otherwise. Ledger-8 CMA likely makes the contract immutable.

## 23. Cannot currently do

- Compact on Windows native
- c2c
- in-circuit Schnorr (0.16.0)
- ledger 9 events as a public-network feature
- Mix 0.34/5.x with Preview/Preprod/Mainnet
- Honest LLM-complete eligibility
- Claim Mainnet without an address
- PHI on ledger / real patient data tests
- Assume npm `wallet-sdk@latest` is 1.2.0

## 24. Wave 1 blockers (bounded, not fatal)

- Hello-world proof+deploy **done**; COHORT proof-server prove still open
- Prove-time unknown on 3 CPU / 5.8 GiB Docker
- Self-attested facts (product honesty)
- Free-text criteria (hand-map only)
- Fresh blinding must be wired
- DUST wait for any public-net demo
- Unused witnesses stripped (use sex or drop it)

## 25. Wave 2 blockers

- Issuer Merkle provenance (`HistoricMerkleTree` compiled; issuer ops not productized)
- Live unshielded escrow + tUSDM if available
- Preview shielded-tNIGHT wallet gaps (parent research TacitPay)
- Physician-mapped richer criteria
- 1AM prove-time on larger circuits

## 26. Wave 3

- Ledger 9 c2c / events / Schnorr **when matrix moves**
- SMART on FHIR
- Mobile Kuira
- Mainnet + real NIGHT bounty

## 27. Minimum viable contract

`COHORT/CONTRACT/cohort.compact` — **compiles**.
`proveEligible(trialId, minAge, maxAge, requireCondition, forbidMedication) -> Boolean`
Private: age, condition, medication, secret, blind.
Public: eligibility boolean, trial-scoped nullifier, referral commitment, proven counter.

## 28. Minimum viable E2E

Public NCT typed bounds + synthetic FHIR facts → witness → Compact proof → indexer shows proven+=1 and a nullifier, not age.
Wallet: 1AM or Lace+6300.
Network: undeployed first, then Preview.

## 29. Cut

Frontend, branding, FHIR server, LLM parser, marketplace, admin, analytics, mobile, AI agent, production payments, HIPAA claims.

## 30. Must test (done / open)

| Test | Status |
|---|---|
| disclose compiler gate | PASS (lab 03 fail compile) |
| eligible / too young / med / missing dx | PASS runtime |
| replay same trial | PASS |
| unlinkable other trial (distinct nul) | PASS hashes |
| fresh blind | FAIL if reused — must fix |
| hello-world ZK proof | **PASS** (deploy 21.8s, call 17.2s, address 84d9eb03…) |
| proof-server prove COHORT | OPEN |
| privacy of proof bytes | OPEN |
| Preview deploy | OPEN |
| wallet click-path | OPEN |

# COHORT TECHNICAL VERDICT

Status: **YELLOW**

Confidence: **86/100** (toolchain, local prove/deploy, and COHORT circuit execution proven; COHORT proof-server prove, 1AM click-path, and Preview still open)

Buildable now: **CONDITIONAL** — yes for Compact/privacy MVP on this PC with real local proofs; not yes for “full product by Monday including live bounty and Mainnet”.

Best environment: **Windows + WSL2 Ubuntu 24.04 + Docker Desktop**, compile under `/home/devmo/cohort-work`, proof-server 8.1.0 on 6300.

Recommended public-network stack: Compact **0.31.1** / language **0.23** / runtime **0.16.0** / midnight-js **4.1.1** / wallet-sdk **1.2.0** / dapp-connector **4.0.1** / proof-server **8.1.0** / node **1.0.2** / indexer Preview **4.3.5** or Preprod **4.3.3-hotfix**.

Main blockers: unmeasured proving; unfinished hello-world tx; self-attestation; free-text criteria; DUST; Mainnet auth.

Wave 1 scope: synthetic FHIR → typed facts → `proveEligible` + trial nullifier + referral commit + public eligible bool; optional recorded bounty; 1AM/Lace demo on undeployed or Preview.

Wave 2: issuer Merkle, live unshielded escrow, richer hand-mapped criteria, prove-time budget.

Wave 3: ledger 9 features if/when public, SMART on FHIR, Mainnet.

Mainnet status: **network live, we cannot claim a deploy. CONDITIONAL / probably not this wave.**

Most dangerous assumption: “eligibility proof” will be mistaken for “clinically true / HIPAA / issuer-backed”.

Most important technical risk: COHORT circuit may be heavier than hello-world (~17–22 s proves). Still unmeasured on proof-server; Docker cap is 3 CPU / 5.8 GiB.

Most important product risk: ClinicalTrials.gov free text cannot become a sound circuit without humans.

First thing we should build tomorrow: send COHORT `proveEligible` through the same proof-server path that just deployed hello-world at `84d9eb03…`.
