# Proving benchmarks

Date: 2026-09-12

## Measured: compile time (compactc 0.31.1, WSL Ubuntu, /home/devmo/cohort-work)

Not proof time.

| Predicates in source | Contract | Compile s | RAM/CPU compile | Notes |
|---|---|---|---|---|
| 0 (store string) | hello-world | 1.97 | not sampled | |
| 1 boolean flag | 01_public_ledger | 0.49 | | |
| 1 commit | 02_private_witness | 3.72 | SHA-256 commit | |
| 1 nullifier insert | 06_nullifier | 3.59 | | |
| ~4 asserts + nullifier + commit | **cohort.compact** | **7.70** | | Wave 1 core |
| Merkle insert | 07 | 2.56 | | |
| unshielded receive | 11 | 1.19 | | |

## Measured: hello-world proof+tx on this PC (proof-server 8.1.0, local node)

| Step | Wall time |
|---|---|
| Wallet sync (shielded+unshielded+dust) | ~1.2 s (22 emissions) |
| Deploy contract (includes prove) | **21813 ms** |
| Call `storeMessage` (includes prove) | **17217 ms** |
| Full vitest file | 40.27 s tests / 42.93 s duration |

Docker stats at idle were ~192 MiB for three containers. Prove-time CPU/RAM during the 22s deploy was **not sampled**. Proof size not printed.

## Not measured (UNKNOWN)

| Scale | Proof gen | RAM | CPU | Proof size | Browser 1AM |
|---|---|---|---|---|---|
| COHORT proveEligible | — | — | — | — | — |
| 5 / 10 / 20 / 30 / 50 predicates | — | — | — | — | — |

## Feasibility implication

Compile of the MVP circuit is cheap. Proving cost is the remaining engineering risk, especially on Docker's **3 CPU / 5.8 GiB** cap and 1AM WASM cold-start. Measure before promising a live judge demo budget.
