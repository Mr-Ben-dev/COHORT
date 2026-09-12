# Existing research extract

Date: 2026-09-12
Scope: parent workspace research is **reference only**. Nothing outside `COHORT/` was overwritten.

Label legend: **FACT** measured or sourced · **INFERENCE** · **RECOMMENDATION** · **UNKNOWN** · **CONFLICT**

## Product (from `03_FINAL_FIVE.md`)

**FACT:** Chosen product is COHORT: private patient facts + public trial criteria → Compact proof of eligibility → optional disclosure/contact → referral bounty.

**FACT:** Wave 1 facts were specified as self-attested. No PHI on ledger. Nullifier `H("cohort:ref", patientSecret, trialId)`.

**INFERENCE:** That architecture is a design, not a compiler result. This lab re-tested it.

## Midnight architecture / versions

**FACT (Kapa, support matrix, 2026-09-12):** Public networks run **Ledger 8.0**. Compact compile **0.31.1**, language **0.23**, compact-runtime **0.16.0**, Midnight.js **4.1.1**, Wallet SDK **1.2.0**, DApp Connector **4.0.1**, proof-server **8.1.0**, node **1.0.2**. Indexer Preview **4.3.5**, Preprod/Mainnet **4.3.3-hotfix**.

**CONFLICT:** Parent research and some tutorials say `compact update` (latest). Latest toolchain is **0.34.0** / language **0.26** / ledger **9**. Official Compact 0.34.0 notes (2026-08-18): ledger 9 is **not** on Mainnet; keep **0.31.x** for public nets.

**CONFLICT:** `midnight-js` main changelog (2026-09-11) bumps compactc 0.34.0, compact-runtime 0.19.0, wallet-sdk 2.0.0-beta.3, ledger-v9. Support matrix still pins **4.1.1 / 1.2.0 / 0.16.0**.

**CONFLICT:** ZK Loan / hello-world local compose pin **node 1.0.0** and **indexer-standalone:4.3.3**. Matrix public node is **1.0.2**. Local `standalone.yml` measured here uses 1.0.0 / 4.3.3.

**CONFLICT:** Docs Windows Compact setup still says `compact update` after installer. Getting-started says `compact update 0.31.1`. **RECOMMENDATION:** always `compact update 0.31.1`.

**CONFLICT:** Getting-started PATH `$HOME/.compact/bin`. Installer 0.5.2 actually placed the **devtools** binary at `$HOME/.local/bin`. Compiler artifacts live in `$HOME/.compact/versions/0.31.1/`.

**FACT:** Compact 0.31.1 compiler error for c2c: `"cross-contract calls are not yet supported"`. Ledger 9 / compact 0.34 adds c2c. midnight-js v5 era seam: v8 arm composes exactly one call.

**CONFLICT:** Compact stdlib docs list `jubjubSchnorrVerify`. compact-runtime **0.16.0** export list on this machine does **not** include it. compact-runtime **0.19.0** API docs do. **RECOMMENDATION:** treat in-circuit Schnorr as **not** a public-network primitive.

**FACT:** `sendUnshielded` / `receiveUnshielded` / `HistoricMerkleTree` / `blockTimeGte` / `persistentHash` / `persistentCommit` compiled on 0.31.1 in this lab.

**FACT:** Predicate-as-argument is an EduProof **pattern**, not a Compact builtin.

## Windows / WSL / Docker

**FACT:** Native Windows Compact is unsupported. Official path is WSL2 Ubuntu + Docker WSL integration + Linux filesystem (not `/mnt/c`).

**FACT:** This PC: Windows 11 Pro for Workstations build 26200, i7-14700HX, ~16 GB RAM, WSL2 Ubuntu 24.04.3, Docker Desktop 4.89.0 / Engine 29.7.2.

**FACT:** Docker Desktop was installed but **stopped** at first audit. After launch: hello-world image ran; proof-server 8.1.0 ran; local node+indexer ran.

**FACT:** Docker resource cap observed: **~5.8 GiB RAM, 3 CPUs**. Idle stack used <200 MiB. Cap is tight for proving, not for idle node.

## Wallets

**CONFLICT:** Older research / screenshot era used "Gerol". Current docs wallets: **Lace, 1AM, Kuira**, plus Cardano multi-chain Lace/Ctrl/Gero. Gero connector is **not documented**. Feature-detect.

**FACT:** Lace: `mnLace`, needs local proof server, **no** `getProvingProvider` / `signData`.
**FACT:** 1AM: in-browser WASM proving, `'1am'`, has `getProvingProvider`.
**FACT:** Kuira: Android on-device proving.
**FACT:** Pin `@midnight-ntwrk/wallet-sdk@1.2.0` exactly; npm `latest` still 1.1.0 (ZK Loan docs).

## DUST / networks

**FACT:** Proof server is **always local** (`localhost:6300`) on every network.
**FACT:** Local network ID docs: `undeployed`. This machine's node `system_chain` returned **`undeployed1`**. Indexer served height 2.
**FACT:** Preview/Preprod/Mainnet RPCs answered 2026-09-12: chain names Midnight Preview / Preprod / Mainnet; indexer heights 826019 / 2510191 / 2542478.
**FACT:** testnet-02 is retired.
**UNKNOWN:** Whether Wave 1 teams can obtain Mainnet deploy authorization. Jay previously: unlikely this wave. No COHORT Mainnet address exists.

## Payments / escrow

**FACT:** Unshielded send/receive compiled.
**INFERENCE:** Live bounty settlement is feasible in Compact on ledger 8, but wallet/DUST/tUSDM Preview gaps remain a product risk.
**RECOMMENDATION:** Wave 1 = recorded bounty eligibility; live payment Wave 2 unless hello-world-style unshielded transfer is proven on undeployed.

## FHIR / ClinicalTrials.gov

**FACT:** API v2 needs no key. Endpoint `https://clinicaltrials.gov/api/v2/studies`. Response header etag `883b003/0.34.1`.
**FACT:** Typed fields exist: `minimumAge`, `maximumAge`, `sex`, `healthyVolunteers`. Eligibility criteria is long free text.
**FACT:** Three studies inspected: NCT07153614, NCT06007248, NCT04200963. Most inclusion/exclusion cannot be encoded as safe Boolean predicates without physician mapping.
**RECOMMENDATION:** Wave 1 hand-mapped typed subset only. No LLM→ZK.

## Privacy / nullifiers

**FACT (this lab):** `persistentHash` domain-separated nullifier + `Set` rejects replay on same trialId and allows a second trial with a distinct nullifier.
**FACT:** Reusing the same commitment blind collapsed referral set size to 1 across two trials. **RECOMMENDATION:** fresh `wBlind` every `proveEligible`.

## Deployment / CMA

**CONFLICT:** Deploy guide for midnight-js 4.x shows `deployContract` succeeding with a sampled signing key as CMA.
**CONFLICT:** midnight-js 5.x `deployContract` retained-era arm **refuses** with `Ledger8DeployUnmaintainableError` because constructor leaves empty committee / threshold 1.
**RECOMMENDATION:** Stay on **4.1.1** for any public-network deploy. Do not copy v5 deploy snippets.

## UNKNOWN

- Exact Mainnet contract-deploy authorization process for Buildathon teams today.
- tUSDM availability on Preview/Preprod as of 2026-09-12 (not re-tested).
- Browser proving time for COHORT circuit on 1AM (not measured).
- Proof-server prove latency for COHORT (compile measured; prove not yet measured).
