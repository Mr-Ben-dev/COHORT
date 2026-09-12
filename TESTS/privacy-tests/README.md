# Privacy tests

Runner: `COHORT/TESTS/privacy-tests/cohort-core.test.mjs`
Executed on: `/home/devmo/cohort-work/sandbox` with compact-runtime 0.16.0 and compiled `managed/cohort`.

Results: `../RESULTS.md`

Assertions covered:

- age/condition/medication not in public circuit **return**
- too-young / excluded-med / missing-condition fail
- replay fails
- cross-trial nullifiers differ

Not covered: searching Halo2 proof bytes, raw FHIR in ledger (FHIR never enters Compact), correlation via reused blinds (documented failure).
