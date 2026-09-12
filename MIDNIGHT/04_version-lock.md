# 04 — Version lock

Date: 2026-09-12
Authority: https://docs.midnight.network/relnotes/support-matrix via Kapa MCP `search_midnight_knowledge_sources`.

# DO NOT MIX COMPACT 0.34.0 / LANGUAGE 0.26 / LEDGER 9 / MIDNIGHT-JS 5.x WITH PREVIEW, PREPROD, OR MAINNET.

`compact update` with no version argument installs **0.34.x**. That is local/stagenet/undeployed-ledger-9 only until the matrix moves.

| Component | Required (public nets) | Latest stable mentioned | Latest pre-release mentioned | Network | Compatible? | Source |
|---|---|---|---|---|---|---|
| Compact language | 0.23 (`pragma language_version 0.23`) | 0.26 (with 0.34 toolchain) | — | Preview/Preprod/Mainnet | YES if 0.23 | support matrix + hello-world README |
| Compact compile | **0.31.1** | 0.34.0 (2026-08-18) | 0.34 line | public = 0.31.1 | YES | matrix; 0.34 notes say keep 0.31.x for current Mainnet |
| Compact devtools | 0.5.1 matrix / **0.5.2 installed** | 0.5.2 | — | all | YES (installer) | matrix 0.5.1 vs installed 0.5.2 **CONFLICT minor** |
| Compact runtime | **0.16.0** | 0.19.0 (ledger 9) | — | public | YES | matrix; npm installed here |
| Compact JS | 2.5.1 | (folded into midnight-js-protocol 4.1.1) | 5.x | public | YES | matrix |
| Platform JS | 2.2.4 | — | — | public | YES | matrix |
| On-chain runtime | 3.0.0 (v3) | v4 on ledger 9 | — | public | YES | matrix |
| Ledger | **8.0** | 9 (not on Mainnet as of 18 Aug 2026) | ledger-v9 rc | public | YES | matrix + compact 0.34 notes |
| Node | **1.0.2** public | 2.1.0-beta.1 (js changelog) | — | public 1.0.2; **local image 1.0.0** | LOCAL IMAGE ≠ PUBLIC NODE | matrix vs standalone.yml |
| Midnight.js | **4.1.1** | 5.0.0 / 5.0.0-beta.7 docs | 5.x | public | YES only 4.1.1 | matrix vs github main |
| testkit-js | 4.1.1 | — | — | public | YES | matrix |
| Wallet SDK | **1.2.0 exact** | npm `latest` still **1.1.0** | 2.0.0-beta.3 | public | YES if pinned exact | ZK Loan; yarn warning in hello-world |
| DApp Connector | **4.0.1** | 4.0.0 notes Jan 2026 | — | public | YES | matrix |
| Indexer | Preview **4.3.5**; Preprod/Mainnet **4.3.3-hotfix** | 4.4.0-rc.5 | — | local compose **4.3.3** | YES per target | matrix vs local yml |
| Proof server | **8.1.0** | 8.1.2 mentioned in js changelog; 9.0.0 RC exists | 9.x | public | YES 8.1.0 | matrix; `latest` tag stale |
| local-dev | midnight-local-dev `standalone.yml` | — | — | undeployed | YES | clone 2026-09-12 |
| hello-world | example-hello-world pins js 4.1.1 / wallet 1.2.0 | compact source **not in repo** | — | local/preview/preprod scripts | YES after creating `.compact` | clone README |
| Node.js | **22+** (22.23.2 installed in WSL) | Host Windows 24.12.0 | — | all | Use WSL 22 | ZK Loan Node 20 crash |

## Project dependency plan (Wave 1)

```
@midnight-ntwrk/midnight-js-protocol@4.1.1
@midnight-ntwrk/midnight-js-contracts@4.1.1
@midnight-ntwrk/midnight-js-http-client-proof-provider@4.1.1
@midnight-ntwrk/midnight-js-indexer-public-data-provider@4.1.1
@midnight-ntwrk/midnight-js-level-private-state-provider@4.1.1
@midnight-ntwrk/midnight-js-node-zk-config-provider@4.1.1
@midnight-ntwrk/midnight-js-network-id@4.1.1
@midnight-ntwrk/midnight-js-types@4.1.1
@midnight-ntwrk/midnight-js-utils@4.1.1
@midnight-ntwrk/testkit-js@4.1.1
@midnight-ntwrk/wallet-sdk@1.2.0
@midnight-ntwrk/dapp-connector-api@4.0.1
@midnight-ntwrk/compact-runtime@0.16.0
```

Resolutions: force wallet-sdk 1.2.0 (hello-world already does; yarn still warned requested 1.1.0).

Image pins:

```
midnightntwrk/proof-server:8.1.0
midnightntwrk/midnight-node:1.0.0          # local only
midnightntwrk/indexer-standalone:4.3.3     # local only
```
