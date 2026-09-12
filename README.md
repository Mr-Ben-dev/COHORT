# COHORT

Prove clinical-trial eligibility on Midnight without sending your private medical facts to the COHORT server.

This directory is the application + Compact circuit + privacy tests. Operator setup is in **[FINAL_SETUP.md](./FINAL_SETUP.md)** (single setup document).

Pinned public-network stack: Compact **0.31.1** / language **0.23** / compact-runtime **0.16.0** / midnight-js **4.1.1** / DApp Connector **4.0.1** / wallet-sdk **1.2.0** / on-chain runtime **3.0.0** (npm `overrides`). Do not mix Compact 0.34 / ledger 9 / midnight-js 5.x with Preview, Preprod, or Mainnet.

Preprod `proveEligible` verifier (`midnight:verifier-key[v6]`) SHA-256 `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1` matches the on-chain contract, repo `packages/contract/zk`, and live `/zk`. No redeploy.

Non-visual DApp interface (future `web` folder): `packages/dapp`. `npm test` includes a dependency-tree guard that fails if two `onchain-runtime-v3` versions appear.

Public Compact 0.31.1 circuit artifacts (not wallet secrets) are served at same-origin `/zk/keys`, `/zk/zkir`, and `/zk/compiler`. FetchZkConfigProvider should use `{origin}/zk/`. The hosted `.prover` file is a circuit proving key, not a seed.

Gold path (Preprod, contract `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`):

Browser → 1AM `getProvingProvider` → `submitCallTx` (2026-09-12, live Render): txId `000657e4fb84d31e2426814305fca09a4af4b0abcf24417b176420eae0aa3a9867`, txHash `3b1624e9cc8c17808f67cb5c52244f197fe57c0c820c75ef5beb7e18b8bf1590`, indexer **proven=2**. The prior Node SDK prove (`00e53324…`) is not this path.

1. Install **1AM** and sync Preprod with tNIGHT + DUST. Do not use a hosted proof-server.
2. Open `https://cohort-y4zr.onrender.com/`. COHORT never draws the 1AM Approve UI on the page.
3. Close the 1AM Transactions dashboard. Click **Connect Midnight wallet**, then click the 1AM toolbar icon and **Approve COHORT**. After connect, 1AM may ask again via `hintUsage` for proving/submit. If the icon still opens balances/Transactions, reload 1AM at `chrome://extensions`, refresh, and retry. The balance screen is not the connect dialog.
4. Enter typed private facts in page memory only. **Generate proof** runs `connect('preprod')` in the same click if needed, then `submitCallTx` via `getProvingProvider` (in-browser WASM). Private facts are never POSTed. Page CSP `connect-src` allows the official Midnight indexer/RPC and 1AM GraphQL (`api-preprod.1am.xyz`); public-state truth stays `indexer.preprod.midnight.network`. Public `/zk` circuit keys are CORS `*` so 1AM can fetch them.

`apps/web` remains the Render same-origin stub. The visual product lives in `web/` (Next.js) and talks to Render `/api` + `/zk`, the official Preprod indexer, and 1AM `getProvingProvider`. Private facts stay in the browser.

Designer frontend (Vercel, public config only): `https://cohort-web-orcin.vercel.app`. Set `NEXT_PUBLIC_COHORT_API_ORIGIN=https://cohort-y4zr.onrender.com`. Never set `VITE_`/`NEXT_PUBLIC_` GitHub, Render, or Vercel tokens.

Privacy: `TESTS/playwright-privacy.test.mjs` launches installed Chrome against a local origin, types PATIENT_A age 31, and asserts cookies/storage/URL/COHORT requests never carry 31/52. 1AM Approve stays a manual wallet click.

## Clean machine

Node **22+**. From this directory (no hosted proof-server, no Compact 0.34 / midnight-js 5.x / `unwrapV9`):

```
npm ci
npm test
```

Then install **1AM**, sync Preprod with tNIGHT + DUST, and open `https://cohort-y4zr.onrender.com/`. Local `npm start` is optional. Lace needs your own `proof-server:8.1.0` on `127.0.0.1:6300` and is not the gold path.
