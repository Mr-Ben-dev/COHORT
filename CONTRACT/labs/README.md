# Compact micro-labs

Compiled with compactc **0.31.1** on 2026-09-12 under `/home/devmo/cohort-work/sandbox`.

| Lab | File | Compile |
|---|---|---|
| 01 public ledger | 01_public_ledger.compact | PASS |
| 02 private witness + persistentCommit | 02_private_witness.compact | PASS |
| 03 disclose required (negative) | 03_disclose_required.compact | FAIL as designed |
| 03 disclose ok | 03_disclose_ok.compact | PASS |
| 04 persistentHash | 04_persistent_hash.compact | written; compile in sandbox if missing |
| 05 persistentCommit | covered by 02 | PASS |
| 06 nullifier | 06_nullifier.compact | PASS |
| 07 HistoricMerkleTree | 07_historic_merkle.compact | PASS |
| 08 predicate-as-argument | COHORT `proveEligible` public criteria | PASS (cohort.compact) |
| 09 private state | witnesses in 02/06/cohort | PASS |
| 10 blockTimeGte | 10_blockTimeGte.compact | PASS |
| 11 unshielded | 11_unshielded.compact | PASS |
| 12 escrow-like | Wave 1 cut — receiveUnshielded compiled; state machine not productized | PARTIAL |
| 13 two private inputs | cohort age+condition+med+secret+blind | PASS |
| 14 commit+reveal | 14_commit_reveal.compact | written |
| 15 replay | 06 + cohort-core.test | PASS runtime |
| 16 linkage | distinct trial nullifiers PASS; reused blind FAIL (documented) | MIXED |
