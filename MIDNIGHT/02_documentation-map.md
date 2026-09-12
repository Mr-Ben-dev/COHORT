# 02 — Documentation map (followed links)

Date: 2026-09-12. Confidence is Kapa+live probe unless noted.

| URL | Title | Version | Tells us | API | Limitation | Example | Deps | Date | Conf |
|---|---|---|---|---|---|---|---|---|---|
| /relnotes/support-matrix | Compatibility matrix | Ledger 8.0 | Pin table | — | Earlier versions unsupported | — | all SDKs | live Kapa | 95 |
| /relnotes/overview | Latest stable | Ledger 8.0 | Public nets same ledger | — | newest npm ≠ supported | — | matrix | live | 90 |
| /guides/networks-and-environments | Networks | undeployed/preview/preprod/mainnet | Endpoints, faucet, prefixes | setNetworkId | proof server always local; testnet-02 dead | vitest RPC checks | Docker local-dev | live | 95 |
| /guides/run-proof-server | Proving locally | 8.1.0 | docker run pin | :6300 | latest stale; Lace hardcodes 6300 | compose yml | Docker | live | 95 |
| /getting-started/installation | Toolchain | compact 0.31.1 | installer + proof server | compact compile --version | Windows not native | docker run 8.1.0 | WSL | live | 90 |
| /guides/windows-compact-setup | Windows Compact | WSL2 | Ubuntu, Docker integration, Compact in Ubuntu | — | `compact update` would get 0.34 | wsl -l -v | Docker | live | 85 |
| /getting-started/hello-world | Hello world | lang 0.23 | create compact file; compile; yarn test:local | storeMessage + disclose | **repo has no .compact** | k=6 rows=26 claimed | yarn, docker | live clone | 90 |
| /how-to/fix-version-mismatches | Version mismatch | matrix | do not mix | npm list | update together | — | matrix | live | 90 |
| /compact/.../explicit-disclosure | Witness protection | 0.23 | disclose required | disclose() | compiler error text | recordBalance | compactc | live | 95 |
| /concepts/.../keeping-data-private | Merkle/nullifier | 0.23 | HistoricMerkleTree + Set | persistentHash | path must bind leaf | increment once | stdlib | live | 95 |
| /guides/security-best-practices | Replay | 0.23 | domain + round | Set.member | domains must differ | replay.test.ts | compact-runtime | live | 95 |
| /tokens/unshielded-token | Unshielded | 0.31.1 | send/receive | sendUnshielded | 0.31.0 range-check bug | local-dev | 4.1.1 pkgs | live | 90 |
| /guides/deploy-and-operate | Deploy | 4.x | providers + deployContract | deployContract | DUST required; CMA sampled | bboard | local-dev | live | 80 |
| midnight-js 5 deployContract TSDoc | Ledger8DeployUnmaintainableError | 5.x | retained deploy refused | — | empty CMA threshold 1 | v8-deploy.test.ts | 5.x | github | 85 |
| /sdks/community/wallets/* | Wallet overview/integration | connector 4.0.1 | Lace vs 1AM proving | ConnectedAPI | feature-detect | portable connect() | 4.0.1 | live | 90 |
| compact 0.34 relnotes | Toolchain 0.34.0 | lang 0.26 | ledger 9, c2c, events | — | not Mainnet | compact update 0.31 | 0.34 | 2026-08-18 | 95 |
| troubleshoot compiler | ZKIR errors | 0.31.1 | c2c not supported | — | restructure | — | compactc | live | 95 |

Follow-the-link rule: support-matrix → network endpoints → local-dev repo → standalone.yml pins 8.1.0 / 4.3.3 / 1.0.0 → hello-world compose same → proving guide warns latest stale.
