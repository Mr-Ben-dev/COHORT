# COHORT Preprod deployer — `scripts/deployer.mjs`

SQUAD F build. Server-side deploy tooling for the COHORT contract
(`CONTRACT/cohort.compact`). Two modes, one file.

## Modes

### `--check` — READ-ONLY, no chain writes

```
node scripts/deployer.mjs --check
```

Derives the Night + Dust addresses from `MIDNIGHT_PREPROD_SEED` using the
official HD path (`m/44'/2400'/0'/role/0`, account 0 — see
https://docs.midnight.network/sdks/official/wallet-developer-guide), compares
them with the configured `MIDNIGHT_PREPROD_DUST` / `MIDNIGHT_PREPROD_UNSHIELDED`
addresses, then queries the Blockfrost Preprod indexer **GraphQL directly** —
no wallet sync:

| Query | What it proves |
|---|---|
| `dustGenerationStatus(cardanoRewardAddresses:)` | Whether the deployer's Cardano reward address (derived from `MIDNIGHT_PREPROD_CARDANO` per CIP-19) is registered for DUST generation; the registered dust address; **current DUST capacity (SPECK)**; **max DUST capacity / cap (SPECK)**; generation rate; backing NIGHT balance (STAR) |
| `block { height }` | Indexer sync status |

Plus a liveness probe of `MIDNIGHT_PROOF_SERVER` (plain HTTP GET, no seed
involved). Prints **one JSON object to stdout** and exits 0. On any failure
prints `{ ok:false, error }` with the exact error and exits 1 — numbers are
never invented.

Units (authoritative, `docs.midnight.network/concepts/dust-architecture`):
1 NIGHT = 1,000,000 STAR · 1 DUST = 1,000,000,000,000,000 SPECK ·
cap ≈ 5 DUST per NIGHT.

### `--deploy` — CHAIN WRITE

```
COHORT_DEPLOYER_PS_PASSWORD='<private-state password>' node scripts/deployer.mjs --deploy
```

**Do NOT run without explicit confirmation from the coordinator.** Written,
never executed by the builder.

1. Re-runs the funding gate (`--check` logic); aborts unless the gate is GO.
2. Resolves the **latest** compiled contract at runtime:
   `packages/contract/.compile-out/contract/index.js` first (the B2 recompile
   target), then `packages/contract/managed/cohort/contract/index.js`.
   Stale copies lacking the attestation circuits are rejected. ZK artifacts
   (`<circuit>.verifier` / `<circuit>.prover`) are required next to it.
3. Initializes the `WalletFacade` from the seed (official init pattern:
   `HDWallet` role keys → `ZswapSecretKeys` / `DustSecretKey` /
   unshielded keystore; `DustWallet.startWithSecretKey(...,
   LedgerParameters.initialParameters().dust)`), syncs, then builds the
   midnight-js providers: indexer public-data provider, level private-state
   provider (store `cohort-deployer`, account = dust address), node ZK-config
   provider, HTTP proof provider (`MIDNIGHT_PROOF_SERVER`), and a
   facade-backed wallet provider (`balanceTx` → `balanceUnboundTransaction` →
   `signRecipe` (unshielded keystore) → `finalizeRecipe`; `submitTx` →
   `facade.submitTransaction`).
4. `deployContract(providers, { contract, privateStateId, initialPrivateState: null })`.
   Witness stubs throw if ever invoked (deploy runs no circuits).
5. **Truth-gate:** polls the indexer `contractAction(address)` until state
   appears (≤5 min), decodes it with the generated `ledger()`, and verifies
   the fresh zero state (`spent`/`referrals`/`attestations` empty,
   `proven`/`attestationsVerified` zero, `issuerId` 32 zero bytes).
6. Prints `{ txHash, contractAddress, truthGate }` as JSON.

Post-deploy follow-up (not in this script): install the demo `ISSUER_ID` via
`initIssuer(id)` using the ceremony secret (`scripts/issuer-ceremony.mjs`
flow).

## The funding gate

`--deploy` refuses to run unless `--check` reports:

- `fundingGate.verdict === "GO"`, i.e.
- the Cardano reward address **is registered** for DUST generation,
- the registered dust address **matches** the seed-derived DUST address,
- the seed-derived DUST address **matches** `MIDNIGHT_PREPROD_DUST` in `.env`,
- **current DUST capacity > 0**.

If the gate is NO-GO, fund first: the tDUST faucet is
`https://midnight-tmnight-preprod.nethermind.dev/` (see `.env`
`MIDNIGHT_PREPROD_FAUCET`), then re-run `--check`.

Current status (2026-10-19, indexer height 3043041): **NO-GO** —
the reward address `stake_test1uplhya00h7zehl7f7g6x0p2aqh4enykuvmckq9egw7s4tgc8euwd6`
(derived from `MIDNIGHT_PREPROD_CARDANO`) returns `registered: false` from
`dustGenerationStatus`. Address derivation itself is verified: seed-derived
dust and night addresses match `.env` exactly.

## Secrets

- `MIDNIGHT_PREPROD_SEED` (24-word mnemonic) is read from
  `~/workspace/cohort-wave2/.env` (`COHORT_WAVE2_ENV` override) into process
  memory only. It is **never** printed, logged, committed, or sent to any
  browser/API. Every error string passes through `redact()` before output.
- `BLOCKFROST_PROJECT_ID` goes only into `?project_id=` query params (header
  auth 404s on this indexer); it is scrubbed from all output (only the host
  `midnight-preprod.blockfrost.io` is printed).
- `COHORT_DEPLOYER_PS_PASSWORD` (deploy only) encrypts the local leveldb
  private-state store; never commit it.

## Preconditions for `--deploy`

1. Funding gate GO (`--check`).
2. Proof server reachable at `MIDNIGHT_PROOF_SERVER`
   (currently `http://127.0.0.1:6300` — the `midnightntwrk/proof-server:8.1.0`
   docker container; **not running** on this VM as of 2026-10-19).
3. `COHORT_DEPLOYER_PS_PASSWORD` set in the environment.
4. Fresh `.compile-out` from the B2 recompile (real demo `ISSUER_ID` in the
   contract source); `--deploy` picks it up automatically at runtime.

## Notes

- The indexer GraphQL schema has **no per-address balance query**; wallet
  balances come from wallet sync. A full wallet-SDK sync path
  (`DustWallet.startWithSecretKey` + `waitForSyncedState`) was prototyped and
  abandoned — it hung without progress against the Blockfrost WS endpoint.
  `--check` therefore reports DUST capacity / NIGHT backing from
  `dustGenerationStatus`, which is exactly what the funding gate needs.
- The shielded address is derived at deploy time via the facade; `--check`
  covers dust + night only (what the gate needs).
