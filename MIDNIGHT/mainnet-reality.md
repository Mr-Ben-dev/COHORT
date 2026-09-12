# Mainnet reality

Date: 2026-09-12

## CAN WE DEPLOY?

**CONDITIONAL**

## Evidence

**FACT:** Mainnet exists. RPC `https://rpc.mainnet.midnight.network` returned `system_chain` = `Midnight Mainnet`. Indexer `https://indexer.mainnet.midnight.network/api/v4/graphql` returned block height **2542478**.

**FACT:** Support matrix lists Mainnet on Ledger 8.0, node 1.0.2, Compact 0.31.1, midnight-js 4.1.1, proof-server 8.1.0, indexer 4.3.3-hotfix.

**FACT:** Proof server remains local even for Mainnet.

**FACT:** No faucet. Real NIGHT / DUST. Funding docs: register NIGHT for DUST.

**FACT:** We have **no** COHORT Mainnet contract address. Rule 10: do not claim Mainnet deployment without one.

**INFERENCE from prior team/Jay notes (parent research, not re-verified with Jay today):** Wave 1 teams are unlikely to get Mainnet deploy authorization this wave.

**CONFLICT:** midnight-js 5.x refuses retained-era `deployContract` as unmaintainable empty CMA. Public nets still want **4.1.1**, whose deploy guide still shows a sampled signing key as CMA. If 4.1.1 still deploys on ledger 8, the contract is practically immutable once the empty/unsatisfiable CMA issue applies to that era. Treat Wave 1 contracts as **immutable**. No upgrade path.

**UNKNOWN:** Current authorization ticket process (who signs, SLA). Not exercised.

## Preview / Preprod

RPCs live:

| Net | chain | indexer height |
|---|---|---|
| preview | Midnight Preview | 826019 |
| preprod | Midnight Preprod | 2510191 |
| mainnet | Midnight Mainnet | 2542478 |
| local | **undeployed1** | 2 |

Faucets: Preview `https://midnight-tmnight-preview.nethermind.dev/` ; Preprod `https://midnight-tmnight-preprod.nethermind.dev/`.

**Not done this session:** funded wallet, DUST wait, `deployContract` against Preview/Preprod.

## Undeployed

Local node+indexer+proof-server **are running on this PC**. Network ID docs say `undeployed`; RPC identity was `undeployed1`. Use `setNetworkId('undeployed')` per SDK docs until a test proves otherwise.
