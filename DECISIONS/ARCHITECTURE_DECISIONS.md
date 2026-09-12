# Architecture decisions

Date: 2026-09-12

## ADR-001 Public-network Compact is 0.31.1 / language 0.23 / ledger 8

WHY: Official support matrix 2026-09-12. Compact 0.34 notes say Mainnet is still 0.31.x.
ALTERNATIVES: 0.34 / ledger 9 for c2c, events, Schnorr.
WHY REJECTED: public nets are ledger 8; mixing breaks deploys.
CURRENT SUPPORT: Preview/Preprod/Mainnet matrix.
SOURCE: docs.midnight.network/relnotes/support-matrix
DATE: 2026-09-12

## ADR-002 No cross-contract calls in Wave 1

WHY: compiler `"cross-contract calls are not yet supported"`; ledger 9 feature.
ALTERNATIVES: wait for ledger 9; two contracts with shared hashes.
WHY REJECTED for Wave 1: cannot deploy c2c to public nets.
CURRENT SUPPORT: none on ledger 8.
SOURCE: troubleshoot compiler errors; compact 0.34 notes

## ADR-003 No in-circuit Schnorr on public nets

WHY: jubjubSchnorrVerify not in compact-runtime 0.16.0 exports; appears in 0.19.0 docs.
ALTERNATIVES: hash-preimage authority (TacitPay pattern); W2 Merkle issuer root.
WHY REJECTED Schnorr: unsupported on target runtime.
CURRENT SUPPORT: hash commit-reveal / Merkle membership
SOURCE: this machine export list + Kapa stdlib mix-up

## ADR-004 Wave 1 facts are self-attested

WHY: no issuer signatures on ledger 8; FHIR stays off-chain.
ALTERNATIVES: trusted evaluator; W2 HistoricMerkleTree issuer roots (lab 07 compiled).
WHY REJECTED for Wave 1 product claim: would over-claim provenance.
CURRENT SUPPORT: witnesses + disclose gate
SOURCE: 03_FINAL_FIVE + this lab

## ADR-005 Trial-scoped nullifier, fresh referral blind

WHY: runtime test: replay rejected; second trial distinct nullifier; reused blind collapsed referrals.
ALTERNATIVES: global patient nullifier (linkable across trials — rejected).
WHY REJECTED global: unlinkability requirement.
CURRENT SUPPORT: Set + persistentHash
SOURCE: cohort-core.test.mjs

## ADR-006 Payments optional in Wave 1

WHY: sendUnshielded compiled, but wallet/DUST/tUSDM Preview path not E2E proven.
ALTERNATIVES: live escrow now.
WHY REJECTED as required: would block the privacy thesis on payment ops.
CURRENT SUPPORT: unshielded ops exist in Compact 0.23
SOURCE: lab 11 compile; TacitPay gap in parent research

## ADR-007 Patient wallet = 1AM first, Lace fallback

WHY: Lace requires local proof-server (bad judge UX). 1AM WASM proving.
ALTERNATIVES: Kuira mobile; Gero (undocumented).
WHY REJECTED Gero: no connector docs.
CURRENT SUPPORT: DApp Connector 4.0.1 feature-detect
SOURCE: wallet overview Kapa

## ADR-008 Criteria are hand-mapped typed subset

WHY: three real CT.gov texts are mostly non-Boolean clinical prose.
ALTERNATIVES: LLM parser.
WHY REJECTED: unsound ZK if the circuit doesn't match the protocol.
CURRENT SUPPORT: CT.gov typed age/sex/HV + synthetic FHIR mapper
SOURCE: criteria-feasibility.md

## ADR-009 Stay on midnight-js 4.1.1

WHY: matrix; 5.x retargets ledger 9 and refuses retained deploy.
ALTERNATIVES: 5.x for future fork.
WHY REJECTED now: public nets ledger 8.
SOURCE: matrix + midnight-js 5 TSDoc
