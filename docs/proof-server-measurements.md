# Proof-server measurements — COHORT hero circuits

SQUAD B6 · 2026-10-19 ~05:45 EEST · STATUS.md B6

## Verdict (read first)

**Real ZK proving time was NOT measured in this environment — no proof server
exists here.** This is documented plainly per the B6 honesty rule; nothing
below invents a proving time. The artifact sizes in §5 are real, measured
bytes from the full-ZK compile output. `scripts/measure-proving.mjs` is the
rerunnable harness for an environment that does have a proof server.

## 1. Methodology (as designed)

Two layers, kept strictly separate:

- **Layer 1 — witness/transcript generation (local).** Run each circuit
  (`attest`, `attestWithAttributes`, `proveAttested`, plus `proveEligible` as
  baseline) through the `@midnight-ntwrk/compact-runtime` simulator — the same
  execution path the test suite uses — and time it. Record the transcript
  shape (public-op count, private-output count) as the witness-size proxy, and
  the committed prover/verifier key and ZKIR sizes. This is transcript
  generation, NOT ZK proof generation.
- **Layer 2 — real ZK proving (proof server).** Build an unproven call
  transaction from initial states
  (`createUnprovenCallTxFromInitialStates` — no network reads, no submission,
  no chain writes) and call `.prove()` through `httpClientProvingProvider`,
  which hits the proof server's `/prove` endpoint circuit-by-circuit.
  ≥3 runs per circuit (default 5), first run excluded as warmup; report
  median and p90 wall-clock ms.

Layer 2 was not executed here (no proof server). Layer 1 was not executed
here either: the compiled circuit bindings it needs
(`packages/contract/.compile-out/contract/index.js`) were deleted from the
working tree by concurrent squad activity, and no Compact compiler is present
to regenerate them (§4). Both blockers are environmental, not conceptual.

## 2. Proof-server inventory: how this repo provisions one

| Question | Finding |
|---|---|
| Docker image provisioned? | Only historically: `ENVIRONMENT/03_docker-proof-server.md` documents `midnightntwrk/proof-server:8.1.0` (digest `sha256:801bbc03…`) run on the **old WSL dev machine** (Docker Desktop, 3 CPU / 5.8 GiB). Not present in this VM. |
| Local `midnight-proof-server` binary? | None in this VM (`which` empty, `/usr/local/bin` has only `cloudflared`). |
| Server URL pinned in repo config? | **No.** Nothing sets a proof-server URL — no env var, no config file, no default in `package.json`, `render.yaml`, or `.env.example`. The http-client proof provider takes the URL at runtime. |
| Production proving model | Proving happens client-side: in-browser WASM (1AM wallet) or a proof server on **the user's own machine** (Docker path, Gero wallet switch). `scripts/judge-verify.mjs` asserts "no hosted proof-server". COHORT servers never proxy witnesses. |
| Why no server here | By design: this repo never hosts a prover; the measurement VM therefore has none. |

## 3. Environment at measurement time

- VM: Linux 7.0.0-39-generic x86_64, **2 CPUs**, **7,935 MB RAM** (task spec: 7.7 GB). ~1.2 GB free during this session; other squads' work was active.
- Node v24.20.0. `docker`: not installed. `compact`: not installed. No proof server on `127.0.0.1:6300`.
- Toolchain pins (unchanged): Compact 0.31.1, ledger 8, proof-server expected 8.1.0, midnight-js 4.1.1, compact-runtime 0.16.0.

## 4. Blockers encountered (why nothing timed was produced)

1. **No proving endpoint.** Fetch of `http://127.0.0.1:6300/version` and `/health`: connection refused. Installing Docker + the proof-server image on this shared 2-CPU VM was judged out of scope for a measurement task (environment modification beyond measurement; old-machine benchmarks already exist in `TESTS/proving-benchmarks.md`).
2. **New-circuit bindings missing.** `packages/contract/.compile-out/contract/index.js` (the JS bindings the B3 simulator tests also expect) was absent — deleted by concurrent squad churn, not by this task. The committed managed build (`packages/contract/managed/cohort/contract/`) only exposes `proveEligible`, so Layer 1 could not run for the new circuits either.
3. **No Compact compiler** to regenerate the bindings (`command -v compact` empty; compile script requires it).
4. **Demo issuer secret exists but was not embedded.** The B2 ceremony installed a real demo `issuerId()` and saved the secret to `scripts/.issuer-secret.json` (gitignored). The measurement script reads it from there or from `COHORT_DEMO_ISSUER_SECRET_HEX`; it never hardcodes it (task rule: no secrets anywhere).

## 5. Real numbers measured (2026-10-19 ~05:30 EEST)

Full-ZK compile artifacts for all four circuits, byte-exact from
`packages/contract/.compile-out/` (Compact 0.31.1, ledger 8):

| Circuit | `.prover` key | `.verifier` key | `.zkir` | `.bzkir` |
|---|---|---|---|---|
| attest | 279,521 B (273 KiB) | 1,351 B | 3,139 B | 197 B |
| attestWithAttributes | 5,205,685 B (4.96 MiB) | 2,119 B | 4,321 B | 279 B |
| proveEligible | 5,208,715 B (4.97 MiB) | 2,119 B | 6,316 B | 380 B |
| proveAttested | 9,967,164 B (9.51 MiB) | 2,119 B | 9,040 B | 548 B |

`compiler/contract-info.json`: 6,149 B.

Observation (not a measurement): prover-key size roughly tracks circuit
proving cost, and `proveAttested` has by far the largest key (~9.5 MiB,
~2× the other two complex circuits). Expect it to be the slowest to prove;
confirm with the script in §6.

## 6. Rerun instructions (future environment with a proof server)

```bash
# 1. Start the pinned proof server (or point at an existing one)
docker run -d --name midnight-proof-server -p 127.0.0.1:6300:6300 \
  midnightntwrk/proof-server:8.1.0
curl -s 127.0.0.1:6300/version   # expect 8.1.0

# 2. Ensure artifacts exist: keys + zkir + contract bindings
ls packages/contract/.compile-out/contract/index.js
# (regenerate with: npm run compile  — needs the Compact 0.31.1 toolchain)

# 3. Demo issuer secret (B2 ceremony output, gitignored — never committed)
ls scripts/.issuer-secret.json

# 4. Run: 5 proving runs per circuit, median + p90, JSON report on stdout
node scripts/measure-proving.mjs
COHORT_MEASURE_RUNS=3 COHORT_PROOF_SERVER_URL=http://127.0.0.1:6300 \
  node scripts/measure-proving.mjs
```

For Layer 2 (real proving) the script additionally needs
`COHORT_LEDGER_PARAMETERS_HEX` — serialized `LedgerParameters` for the target
network (e.g. from the dapp's `MidnightProvider`: 
...[truncated 1865 chars]