# 03 — GitHub forensics

Date: 2026-09-12
Clones (unmodified source; depth 1) at `/home/devmo/cohort-work/repos/`:

- `example-hello-world`
- `midnight-local-dev`
- `compact`

## example-hello-world

**FACT:** `package.json` engines node `>=22`, compact compile script `compact compile contracts/hello-world.compact contracts/managed/hello-world`.

**FACT:** Dependencies pinned `@midnight-ntwrk/midnight-js-*@4.1.1`, `@midnight-ntwrk/wallet-sdk@1.2.0`, testkit-js 4.1.1. Resolutions force wallet-sdk 1.2.0.

**FACT:** `contracts/` contains only `index.ts`. README tells you to **create** `hello-world.compact`. Depth-1 clone has no Compact source and no `managed/` artifacts.

**FACT:** `index.ts` uses `CompiledContract.make(...).pipe(withVacantWitnesses, withCompiledFileAssets)` from `@midnight-ntwrk/midnight-js-protocol/compact-js` **4.1.1** — this is the 4.x API, not a reason to jump to 5.x.

**FACT:** yarn install warned: `Resolution field wallet-sdk@1.2.0 is incompatible with requested version 1.1.0`. Confirms npm latest/transitive 1.1.0 hazard.

**FACT:** compose.yml = proof-server 8.1.0, indexer-standalone 4.3.3, midnight-node 1.0.0, ports 6300/8088/9944.

## midnight-local-dev

**FACT:** `standalone.yml` same image pins. Node healthcheck waits for block hash #1 (not merely `/health`) to avoid indexer race.

**FACT:** Node `system_chain` on this PC: `undeployed1`. Indexer height 2 after ~15s.

**FACT:** README funding menu (`npm start`) not run. Containers started with `docker compose ... up -d node indexer` plus separately started proof-server.

## compact

Shallow clone of language/compiler repo. Devtools 0.5.2 installed from GitHub installer, not from this clone. Compiler 0.31.1 zip extracted under `~/.compact/versions/0.31.1/x86_64-unknown-linux-musl/` containing `compactc`, `compactc.bin`, `zkir`, `zkir-v3`, format, fixup.

## Not cloned (time)

midnight-js, midnight-sdk, midnight-node, wallet, dapp-connector-api. Kapa already returned their current docs/source excerpts. **RECOMMENDATION:** clone midnight-js **tag 4.1.1** not `main` if we need source.

## Recency

- Support matrix still 4.1.1 / 0.31.1 as of Kapa 2026-09-12.
- midnight-js main (2026-09-11) is already on 0.34 / ledger 9 / wallet 2 beta. **OLD TUTORIAL vs CURRENT MAIN:** do not follow `main`.
- Compact 0.34.0 dated 2026-08-18 explicitly: Mainnet stays 0.31.x.
