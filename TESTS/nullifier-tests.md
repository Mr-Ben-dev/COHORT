# Nullifier tests

Date: 2026-09-12
Runner: `node /home/devmo/cohort-work/sandbox/cohort-core.test.mjs`
Runtime: `@midnight-ntwrk/compact-runtime@0.16.0` (not on-chain).

## Formula

```
nul = persistentHash(["cohort:ref" padded to 32, trialId, patientSecret])
assert !spent.member(disclose(nul))
spent.insert(disclose(nul))
```

Scope: **per (patientSecret, trialId)**. Not global per patient.

## Cases

| Case | Expected | Observed |
|---|---|---|
| same patient, same trial, second proveEligible | reject | `already proven this trial` |
| same patient, different trialId | allow, distinct nul | proven 1→2, two hex nullifiers differ |
| different patient (not run) | allow | UNKNOWN this session |

## Domain separation

Referral commitment = `persistentCommit(secret, blind)`, not the nullifier hash. If `blind` is reused, referral set size did **not** increment (observed size 1 after two trials). Rotate blinds.

## Ledger state after two trials

- `proven` Counter = 2
- `spent` size = 2
- `referrals` size = 1 if same blind (bug if intended unique referrals)

On-chain replay after a real submit is still UNKNOWN until hello-world-style deploy+call is run.
