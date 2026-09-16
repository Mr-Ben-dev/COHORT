# COHORT — private clinical-trial recruitment on Midnight

**Find trials you may qualify for. Check your fit privately. Prove it on Midnight. Choose what happens next — without handing over your health record.**

## The problem

Trials fail on recruitment, not science. The standard fix is to make patients surrender a medical record to a screening vendor **before** anyone says whether they qualify. That is the wrong trust boundary. The patient spends the most sensitive data they own to buy a yes/no bit. The vendor becomes a breach target. The site still reads unqualified leads. Nobody in that loop needs the record to compute typed eligibility — they need one verifiable bit.

## What COHORT is

A recruitment rail, not a records warehouse and not a ZK calculator:

**DISCOVER → PRIVATE MATCH → VERIFY → QUALIFICATION → CONTROLLED HANDOFF**

Public study rules come from ClinicalTrials.gov API v2, reduced to a hand-mapped typed subset. Age and mapped condition/medication flags stay in an AES-GCM IndexedDB vault, namespaced per wallet. The typed match runs on the device. 1AM proves in-browser with WASM and submits to Midnight Preprod. What becomes public is a trial-scoped nullifier, a blinded referral commitment, and a counter — never a fact. The patient then chooses: keep private, publish the public-safe qualification, open the official study, or copy a public packet.

## Why Midnight is necessary

The product needs private witnesses and public integrity in the same transaction. `proveEligible(trialId, minAge, maxAge, requireCondition, forbidMedication)` takes `wAge`, `wCondition`, `wMedication`, `wSecret`, `wBlind` and asserts the typed predicate. Compact `disclose()` only lets hashes cross into ledger state: `persistentHash(["cohort:ref", trialId, sk])` into `spent`, `persistentCommit(sk, blind)` into `referrals`. `proven` increments. Replay is set non-membership before insert. Domain-separated nullifiers are not linkable across trials by that token. COHORT does not host a proof-server: witnesses in the clear at a vendor prover would recreate the Web2 boundary.

Public-network pin (official matrix, 2026-09-16): Compact **0.31.1** / language **0.23** / compact-runtime **0.16.0** / midnight-js **4.1.1** / DApp Connector **4.0.1** / wallet-sdk **1.2.0** / on-chain runtime **3.0.0**. Compact 0.34 / midnight-js 5 / ledger 9 are not for Preprod.

## Architecture (Wave 1)

Browser (encrypted profile + local matcher) → 1AM WASM prover → Preprod `proveEligible` → official indexer. Render serves public trials, `/zk` keys, and a privacy gate. Vercel serves the designer. No COHORT proof-server. No PHI database.

## Wave 1 — actually shipped

- Circuit on Preprod: `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`. Verifier SHA-256 `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`, byte-identical on-chain, in-repo, and on live `/zk`. Full Compact 0.31.1 compile reproduces that verifier (prover 5,208,715 bytes). The contract was not redeployed for UI work.
- Circuit asserts: age in public `[minAge,maxAge]`; condition/medication flags vs public policy; trial-scoped nullifier unused; referral commitment inserted; `proven++`. Return is boolean `true`. Age never appears in ledger fields.
- Real browser proofs. Documented gold path: txHash `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60`, txId `002000dc2327f9391931cb5747f2e1f36480bb948634913ddcacc411cddea0d31d` (then indexer proven=6). Earlier 1AM proves include `973084…` (block 2524713, proven=5) and `40527ba6…` (block 2523970, proven=4). Live `ledger()` is the source of the current counter; a later indexer `contractAction` is labeled indexer-verified, not a recreated demo.
- Wallets: 1AM gold path is click-synchronous `connect('preprod')` → `getProvingProvider` → `submitCallTx`. Lace connects; proving fail-closes (no proving provider). Disconnect is local session teardown.
- Backend structurally refuses PHI: payloads with `age`, `condition`, `fhir`, `secret`, `profile` return HTTP 400 without echoing values.
- Judge path: `npm run compile` (full Compact 0.31.1, not skip-zk), `npm test`, `npm run judge:verify`. Apache-2.0.
- Live: designer on Vercel, API on Render, contract on Preprod.

## Privacy

Private, on device: age, mapped flags, witness secret, blinding factor, encrypted profile. Public: circuit name, contract, disclosed hashes, counter, transaction metadata. Off-chain, only if the user shares: `{trialId, txHash, contractAddress, networkId}`. localStorage holds wallet rdns only. Privacy is what an observer can **correlate**, not whether one field is hidden — hence fresh blinds and domain-separated nullifiers. Metadata (timing, entry point) remains visible. No HIPAA claim.

## Wave 1 scope

This Wave verifies the supported typed subset. Facts are self-attested. `wSex` is unused. Qualification is an indexer-confirmed Preprod transaction, not enrollment.

## Wave 2 — planned

A site console that confirms a public proof from trial id + tx hash against the official indexer: two-sided verification, no inbox, no PHI. Challenge-bound proofs and issuer signatures ship only if they compile on 0.31.1 and 1AM can prove them. Failed gates are deferred in writing, not faked.

## Wave 3 — planned

Re-read the support matrix first. Mainnet gets a **new address**, not a Preprod transplant. Then monitoring, prove-path rollback, security review, site verification on the Mainnet indexer. Escrow/issuer only with live cryptographic evidence.

## Check it

https://cohort-web-orcin.vercel.app · https://github.com/Mr-Ben-dev/COHORT · slides https://docs.google.com/presentation/d/1rh8v0kRFcEy3liyNkhEAiIQjt-M1qDuC/edit?usp=sharing&ouid=106789465777329337053&rtpof=true&sd=true · video https://youtu.be/PLnJ0M-3hxs · Apache-2.0 · topic `midnightntwrk` · `npm run compile` · `npm test` · `npm run judge:verify` · indexer `queryContractState` on the Preprod address above.
