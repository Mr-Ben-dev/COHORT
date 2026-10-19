# COHORT — Preprod Contract Deploy Runbook (owner)

**Why this exists:** the build VM's egress proxy breaks WebSocket TLS to
Blockfrost, so the deployer wallet cannot sync there. The deploy must run
from a machine with clean internet (your laptop is fine).

**What deploys:** the new attestation contract (`attestations` Set +
`attest()` + `attestWithAttributes()` + `proveAttested()` + `initIssuer()`,
all compiled full-ZK on compactc 0.31.1; verifier SHAs in
`docs/verifier-keys.md`).

## Prerequisites

1. Clone the repo (branch `main`, HEAD has everything):
   `git clone https://github.com/Mr-Ben-dev/COHORT.git && cd COHORT`
2. Node 20+ and `npm ci` at the repo root.
3. The 24-word deployer seed (you have it). The seed derives:
   - unshielded `mn_addr_preprod19hq7wznqh0h77tmevr6zzdusc4cp0j4feya28ws59r9ms5k8au0s6ed55f` (Account 1 in your 1AM — already holds the 5001 DUST)
   - dust `mn_dust_preprod1ww67p9wjaafr4g4q642r4a8q0fyznyjywz88emcsnjzckj7yzzgngxhy75f`
4. Proof server on `http://127.0.0.1:6300`:
   `docker run -p 6300:6300 midnightntwrk/proof-server:8.1.3`
   (any 8.1.x works; the repo's harness was validated against 8.1.3)
5. `.env` file at the repo root (or set env vars) with:
   - `BLOCKFROST_PROJECT_ID` (your Preprod token)
   - `MIDNIGHT_PREPROD_SEED` (the 24 words)
   - `COHORT_DEPLOYER_PS_PASSWORD` (any strong password — encrypts the local private-state store)
   - `MIDNIGHT_PREPROD_UNSHIELDED=mn_addr_preprod19hq7wznqh0h77tmevr6zzdusc4cp0j4feya28ws59r9ms5k8au0s6ed55f`
   - `MIDNIGHT_PREPROD_DUST=mn_dust_preprod1ww67p9wjaafr4g4q642r4a8q0fyznyjywz88emcsnjzckj7yzzgngxhy75f`
   - `MIDNIGHT_PREPROD_CARDANO=addr_test1qpyrnsge0kddgft70vg7z00gykflqdjefzpy6d7fqxknwerlwf67l0u9n0lunu35v7z46p0tnxfdceh3vqtjsaap2k3sejsqze`
   - `MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6300`

## Steps

1. `node scripts/deployer.mjs --check`
   - Expect: `night.match: true`, `dust.match: true`, `proofServer.alive: true`.
   - `dustGenerationStatus.registered` may still read `false` — that flag
     tracks *generation* registration; your 1AM holds 5001 spendable DUST,
     which is what the deploy spends. If `--check` refuses with NO-GO on
     the registration flag alone, re-run with the bypass:
     `COHORT_DEPLOY_BYPASS_GENERATION_FLAG=1 node scripts/deployer.mjs --deploy`
     (the bypass keeps the identity checks and the live DUST-balance read;
     it only skips the generation-registration proxy flag — reasoning is
     documented in `docs/deployer.md`).
2. `node scripts/deployer.mjs --deploy`
   - The script syncs the wallet, builds the deploy tx, proves via your
     local proof server, submits, then **truth-gates**: it reads the tx
     back from the indexer before printing it.
3. On success it prints the new contract address + deploy tx hash.
   - Verify on https://preprod.midnightexplorer.com/ yourself.
4. Fill the `[FILL AFTER DEPLOY]` markers (29 across `docs/` + `README.md`)
   with the real address / tx hashes / explorer links, then:
   `git add -A && git commit -m "..." && git push`
5. Redeploy the API (Render) and frontend (Vercel) so the live sites serve
   the new contract address.

## If it fails

- "sync timeout": your network is filtering WebSockets — try another network.
- "insufficient funds": the DUST in 1AM may sit under Account 2
  (`mn_addr_preprod16zs...`); move it to Account 1 or tell the team.
- Anything else: paste the full stderr (it redacts secrets automatically).
