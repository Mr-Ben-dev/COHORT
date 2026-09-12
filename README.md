# COHORT

Prove clinical-trial eligibility on Midnight without sending your private medical facts to the COHORT server.

This directory is the application + Compact circuit + privacy tests. Operator setup is in **[FINAL_SETUP.md](./FINAL_SETUP.md)** (single setup document).

Pinned public-network stack: Compact **0.31.1** / language **0.23** / compact-runtime **0.16.0** / midnight-js **4.1.1** / DApp Connector **4.0.1** / wallet-sdk **1.2.0** / on-chain runtime **3.0.0** (npm `overrides`). Do not mix Compact 0.34 / ledger 9 / midnight-js 5.x with Preview, Preprod, or Mainnet.

Non-visual DApp interface (future `web` folder): `packages/dapp`. `npm test` includes a dependency-tree guard that fails if two `onchain-runtime-v3` versions appear.

Public Compact 0.31.1 circuit artifacts (not wallet secrets) are served at same-origin `/zk/keys`, `/zk/zkir`, and `/zk/compiler`. FetchZkConfigProvider should use `{origin}/zk/`. The hosted `.prover` file is a circuit proving key, not a seed.
