# Privacy / replay / proving results

Date: 2026-09-12

## Compact compile (WSL, compactc 0.31.1, Linux FS)

| Artifact | Exit | Wall time | Notes |
|---|---|---|---|
| hello-world.compact | 0 | 1.97s | managed keys + zkir + JS |
| cohort.compact | 0 | 7.70s | proveEligible |
| 01_public_ledger | 0 | 0.49s | |
| 02_private_witness persistentCommit | 0 | 3.72s | |
| 03_disclose_required | **255** | 0.31s | compiler: potential witness-value disclosure |
| 03_disclose_ok | 0 | 0.47s | |
| 06_nullifier | 0 | 3.59s | |
| 07_historic_merkle | 0 | 2.56s | HistoricMerkleTree<10> |
| 10_blockTimeGte | 0 | 0.47s | |
| 11_unshielded | 0 | 1.19s | receiveUnshielded native token |

Proof **generation** via proof-server was **not** measured (no hello-world `yarn test:local` completed). Compile times above are not prove times.

## compact-runtime 0.16.0 local execution (`cohort-core.test.mjs`)

| Test | Result |
|---|---|
| eligible age 42, min 30 max 50, condition required, med forbidden | **true**, proven=1, spent=1, referrals=1 |
| age 17 | `failed assert: too young` |
| medication true | `failed assert: medication excluded` |
| condition false | `failed assert: missing condition` |
| replay same trialId | `failed assert: already proven this trial` |
| same secret, trial 2 | true, proven=2, spent=2 |
| two nullifiers distinct | yes `cbba1af7…` vs `7e23633d…` |
| public result JSON | `"true"` only; no `42` |

**FACT:** Reused `wBlind` kept referral set size 1 on the second trial. Fresh blinding is mandatory.

**FACT:** COHORT checks above are **circuit execution**, not a Halo2 proof. Official hello-world **did** prove via proof-server 8.1.0 on this host (deploy 21.8 s, storeMessage 17.2 s, address `84d9eb03…`). COHORT proveEligible through the proof-server is still open.

## FHIR

`patient-001.json` → ageYears 42, sex 2 (female), ICD E11.9, RxNorm 6809, witness `{age:42, condition:true, medication:true}`. That witness would **fail** a forbidMedication trial.

## Privacy tests remaining

No string search of serialized **proof** bytes (only of circuit return). Private state remains in the Node process during local execution — that is expected. Ledger fields are Sets of hashes + Counter.

## Nullifier formula (implemented)

```
persistentHash<Vector<3, Bytes<32>>>([pad(32, "cohort:ref"), trialId, sk])
```

Domain `cohort:ref` must never be reused for the referral commitment. Referral uses `persistentCommit(secret, blind)` instead.
