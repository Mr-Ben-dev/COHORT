# Wallet matrix (COHORT)

Date: 2026-09-12
Source: https://docs.midnight.network/sdks/community/wallets/community-wallets-overview + integration page (Kapa). Screenshot of current docs matches Lace / 1AM / Kuira.

| Wallet | Connector | Proving | Private state | signData | DUST | Networks | Browser | Mobile | Passkeys | COHORT role |
|---|---|---|---|---|---|---|---|---|---|---|
| **Lace** | `mnLace` | Local proof-server only. No `getProvingProvider` | Wallet-held | **No** | Yes | undeployed/preview/preprod/mainnet | Chrome/Edge | No Midnight | Unknown | Site/judge if Docker proof-server is up |
| **1AM** | `'1am'` | In-browser WASM Halo2/BLS12-381. Has `getProvingProvider` | Wallet-held | Not documented | Yes; shielded by default | public nets | Chrome/Firefox | Beta | Unknown | **Best patient demo** (no Docker for proving) |
| **Kuira** | Not documented DApp connector | On-device Android | SDK | n/a | Yes | — | No | Android alpha | Unknown | Later mobile patient |
| **Gero** | Not documented | Not documented | — | — | Not documented | Cardano+Midnight | Yes | Yes | — | Do not depend |
| **Wallet SDK 1.2.0** | headless | HTTP proof provider to localhost:6300 | level private state provider | SDK sign | Yes | all | n/a | n/a | n/a | **CI, site backend, tests** |
| **midnight-wallet-cli** | CLI/MCP | local/server | — | CLI | register dust | capitalized `Preview` etc | n/a | n/a | n/a | Agents / no-extension |

## Pick

- **Patient demo:** 1AM first (judges should not have to run Docker). Feature-detect `getProvingProvider`; fall back to Lace + local 6300.
- **Site/sponsor CLI:** Wallet SDK 1.2.0 + proof-server 8.1.0.
- **Judge path if 1AM flaky:** Lace + documented `Settings → Midnight → Local http://localhost:6300`.
- **Do not** hard-code `proverServerUri` (deprecated). Do not require `signData` (Lace missing).

## Not tested in-browser this session

No Chrome extension click-path. Connector behavior is from current docs, not a live Lace/1AM session.
