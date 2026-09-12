# 01 — Kapa MCP research log

Endpoint: `user-midnight` / `search_midnight_knowledge_sources` (https://midnight.mcp.kapa.ai)
Date: 2026-09-12
Method: multiple targeted queries, not a single hit.

## Queries run

1. Support matrix versions Preview/Preprod/Mainnet
2. Windows WSL2 Compact Docker repo path
3. Proof-server image/tag/port + local network
4. Compact 0.23 witnesses, disclose, persistentHash/Commit, HistoricMerkleTree, nullifiers, predicate-as-argument
5. Deploy Mainnet/Preview/Preprod, CMA, ledger 8 immutability
6. Wallets Lace/1AM/Kuira/Gero, getProvingProvider, signData
7. sendUnshielded/receiveUnshielded, c2c, jubjubSchnorrVerify, language pragma
8. compact update 0.31.1 extraction
9. c2c compiler error + ledger 9

## High-value URLs

- https://docs.midnight.network/relnotes/support-matrix
- https://docs.midnight.network/relnotes/network
- https://docs.midnight.network/guides/networks-and-environments
- https://docs.midnight.network/guides/run-proof-server
- https://docs.midnight.network/guides/windows-compact-setup
- https://docs.midnight.network/getting-started/installation
- https://docs.midnight.network/getting-started/hello-world
- https://docs.midnight.network/how-to/fix-version-mismatches
- https://docs.midnight.network/compact/smart-contract-security
- https://docs.midnight.network/concepts/how-midnight-works/keeping-data-private
- https://docs.midnight.network/guides/security-best-practices
- https://docs.midnight.network/guides/deploy-and-operate
- https://docs.midnight.network/sdks/community/wallets/community-wallets-overview
- https://docs.midnight.network/sdks/community/wallets/community-wallets-integration
- https://github.com/midnightntwrk/midnight-local-dev
- https://github.com/midnightntwrk/example-hello-world
- https://github.com/midnightntwrk/compact/releases

## Excerpts that bound COHORT

- Matrix: Compact 0.31.1 / runtime 0.16.0 / midnight-js 4.1.1 / wallet-sdk 1.2.0 / proof-server 8.1.0 / ledger 8.0 on all public nets.
- Compact 0.34.0 (2026-08-18): language 0.26, runtime 0.19, **ledger 9**; Mainnet still 0.31.x.
- Compiler: `"cross-contract calls are not yet supported"` on 0.31.1 ZKIR stage. C2C is ledger 9.
- `disclose()` is compiler permission, not a cryptographic reveal. Witness values cannot hit ledger/export without it.
- `persistentCommit` with unique rand does not need disclose to store the commitment.
- Nullifier pattern: domain-separated `persistentHash` + `Set`. Domain must differ from commitment domain.
- Proof server always local; pin 8.1.0; `latest` stale.
- Windows: WSL2, Linux FS, Docker WSL integration.
- Lace no getProvingProvider/signData; 1AM WASM proving.
- midnight-js 5 retained-era deploy refused as unmaintainable empty CMA.

## Ambiguity follow-ups

- jubjubSchnorrVerify listed in stdlib pages but not in compact-runtime 0.16.0 exports → treat as 0.19/0.26.
- `system_chain` local = `undeployed1` vs docs `undeployed`.
- Compact installer path `~/.local/bin` vs docs `~/.compact/bin`.
- Local node image 1.0.0 vs public 1.0.2.
