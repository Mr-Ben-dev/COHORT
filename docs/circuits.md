# COHORT — Circuit Documentation

Source of truth: `CONTRACT/cohort.compact` (language version 0.23, `CompactStandardLibrary`).
Every claim below is traceable to that file. Nothing here is asserted about compiled
artifacts, deploys, or off-chain code — only the contract source.

COHORT's pitch in one sentence: **prove you qualify for a clinical trial without
handing over your medical record.** There are two ways to do this in the contract:
`proveEligible` (Wave 1, self-asserted attributes) and `proveAttested` (issuer-attested
attributes).

---

## 1. `proveEligible` — Wave 1, self-asserted eligibility

Deployed on Preprod at contract address `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`.
Verifier SHA: `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`.

### What it proves

`proveEligible(trialId, minAge, maxAge, requireCondition, forbidMedication)` takes
five public inputs and four private witnesses (`wAge()`, `wCondition()`, `wMedication()`,
`wSecret()`). It computes over **committed attributes** — values the prover supplies
privately and never reveals on chain:

1. **Typed eligibility predicate.** `age` is `Uint<8>`; `cond`/`med` are `Boolean`.
   - `assert(age >= minAge)` / `assert(age <= maxAge)` — age window.
   - If `requireCondition`: `assert(cond)` — the qualifying condition must be true.
   - If `forbidMedication`: `assert(!med)` — excluded medication must be false.
2. **Per-trial nullifier.** `trialNullifier(trialId, sk)` = `persistentHash` of the
   vector `[pad(32, "cohort:ref"), trialId, sk]`, where `sk` is the holder's secret
   witness. The circuit asserts the nullifier is not already in the `spent` ledger
   set (`"already proven this trial"`), then inserts it. One secret → one proof per
   trial: the same holder cannot prove eligibility for the same trial twice, and
   different trials produce unlinkable nullifiers (the holder's secret never appears
   on chain, only its hashes).
3. **Referral receipt.** `persistentCommit<Bytes<32>>(wSecret(), wBlind())` is inserted
   into the `referrals` ledger set — an opaque, holder-owned receipt that a
   qualifying proof happened, without revealing who or what qualified.
4. **Counter.** `proven.increment(1)` — a public count of successful eligibility proofs.

### What it does NOT prove

**Medical truth.** In Wave 1, `wAge()`, `wCondition()`, and `wMedication()` are
**self-asserted by the prover** — the circuit has no way to check whether the
supplied age or condition corresponds to reality. It proves *correct computation
over committed private inputs*: "whoever holds this secret satisfies this trial's
predicate, exactly once." It does not prove the inputs are medically true, and it
does not bind the proof to any real person's record. Closing that gap is the job
of the issuer-attested trio below (which closes the *attribution* gap — an issuer
signed off on the attributes — not the *authenticity* gap; see §3).

---

## 2. The issuer-attested trio: `attestationOf`, `attest`/`attestWithAttributes`, `proveAttested`

Hash-native design — no signatures anywhere in the contract.

### 2.1 `attestationOf` — commitment construction

`attestationOf(age, cond, med, holderSecret, nonce)` builds a binding commitment
between a set of attributes and a holder:

- `attrsHash = persistentHash` over the typed tuple `[pad(32, "cohort:attrs"), age, cond, med]`.
  The `pad(32, "cohort:attrs")` element is **domain separation**: it makes this hash
  provably distinct from hashes computed for other purposes in the contract
  (`cohort:ref`, `cohort:holder`, `cohort:attnul`), even if the remaining elements
  collided.
- `binding = persistentHash` over `[pad(32, "cohort:holder"), holderSecret, nonce]`.
  `holderSecret` binds the commitment to one holder; `nonce` lets the same holder
  receive fresh, unlinkable attestations.
- Returns `persistentCommit<Bytes<32>>(attrsHash, binding)` — the attestation value
  that gets published on the `attestations` ledger set.

Implementation note (from the contract comments): `disclose()` is a **compiler
permission marker, not a bytes conversion** — it is the identity at the value level.
That is why `attestationOf` hashes **typed tuples** rather than "converted" bytes.
Anyone recomputing an attestation off-chain must reproduce this exact tuple
construction — or skip off-chain agreement entirely and call
`attestWithAttributes`, which computes the commitment in-circuit.

### 2.2 `attest` / `attestWithAttributes` — issuer gating

- `attest(attestation)`: publishes a precomputed attestation commitment. Two gates:
  `assert(disclose(wIssuerSecret()) == issuerId())` — only the issuer may call it —
  and a replay check (`"attestation already published"`) before inserting into the
  `attestations` set.
- `attestWithAttributes(age, cond, med, holderSecret, nonce)`: the preferred issuance
  path. Same issuer gate, but the attestation is **computed in-circuit** from the raw
  attributes via `attestationOf`, then replay-checked and inserted. The issuer never
  needs to agree with anyone on an off-chain hash encoding.

`issuerId()` is the identity of the issuer (see §3). `issuerIdOf(secret)` is a
ceremony helper that returns `disclose(secret)` — i.e. the 32 secret bytes unchanged —
so the key-ceremony script can compute the value to bake into `issuerId()`.

### 2.3 `proveAttested` — membership + predicate over attested attributes

`proveAttested(trialId, minAge, maxAge, requireCondition, forbidMedication)` is the
holder-side proof that their **issuer-attested** attributes qualify:

1. Recomputes the attestation from witnesses: `attestationOf(wAge(), wCondition(),
   wMedication(), wHolderSecret(), wNonce())`.
2. **Membership**: asserts the recomputed attestation is published in the
   `attestations` set (`"no issuer attestation for these attributes"`). This is the
   attestation step — the attributes were signed off by the issuer.
3. **Program-scoped nullifier**: `persistentHash([pad(32, "cohort:attnul"), trialId,
   disclose(att)])`, asserted absent from `spent` then inserted. One attestation can
   be used once per trial — it cannot be reused across trials by the same holder,
   and it cannot be double-spent within a trial. Note the difference from §1: the
   Wave-1 nullifier is keyed by the holder's secret; this one is keyed by the
   attestation itself.
4. **Same typed predicate** as `proveEligible` (age window, condition, medication).
5. Same referral receipt (`persistentCommit(wSecret(), wBlind())` into `referrals`),
   `proven.increment(1)`, and additionally `attestationsVerified.increment(1)` — a
   public counter of successful attested proofs.

---

## 3. Trust boundary — read this before trusting any proof

**The demo issuer is a DEMO issuer.** It is not a hospital, not a clinic, and not a
medical authority. It is the key-ceremony operator: whoever runs the ceremony holds
the issuer secret and can attest any attributes to any holder.

**The issuer gate compares against `issuerId()`, which is currently a placeholder.**
The contract's `issuerId()` circuit returns 32 zero bytes (`"\x00" × 32`), marked
`// CEREMONY-REPLACE: ISSUER_ID_BYTES` for the key ceremony to replace with the
real value. The contract comment states the rationale explicitly: zeros are the
safe placeholder — finding a preimage is infeasible, so **no issuer secret can
pass the gate until the ceremony runs**. Right now, `attest` and
`attestWithAttributes` cannot be successfully called by anyone.

**What changes when a real issuer key is installed.** The ceremony computes
`issuerIdOf(demoIssuerSecret)` — i.e. the raw 32 secret bytes — and bakes them into
`issuerId()`. After that, only someone presenting that secret passes the issuer
gate. But per the B1 deviation note: because `disclose()` is the value-level
identity, the baked-in `ISSUER_ID` **equals the raw issuer secret bytes**, which are
readable from the contract source/compiled circuit. The gate is therefore
**demo-grade — knowledge of the pre-ceremony secret — not a cryptographic secret.**
If the issuer check needs to be secret-backed, it must move to a hash preimage
(e.g. `persistentHash` of the secret); that is a contract spec change, not something
this document can paper over.

**What the circuit still cannot prove.** Even with a real issuer: the circuit proves
that *someone holding the issuer secret attested these attributes for this holder*.
It cannot prove the **authenticity of the medical record** — that the attested age
or condition corresponds to a real clinical encounter, a real chart, or a real
person. That chain of custody (record → issuer → attestation) lives entirely
off-chain, between the record system and whoever operates the issuer key. The
circuit guarantees correct computation and correct attribution; everything about
the truth of the underlying record is a human/process trust assumption.

---

## 4. Flow

```mermaid
flowchart LR
    subgraph Issuer
        I[Issuer holds\nissuer secret] --> G{issuer gate:\ndisclose(wIssuerSecret) == issuerId()?}
        G -->|yes| A[attestWithAttributes:\nattestationOf(age,cond,med,holderSecret,nonce)\ncomputed in-circuit]
        A --> P[attestations set\non ledger]
    end
    subgraph Holder
        H[Holder holds\nage, cond, med,\nholderSecret, nonce] --> PA[proveAttested:\nrecompute attestation,\nassert member of attestations,\nassert nullifier fresh,\nassert predicate]
        PA --> S[spent set:\ncohort:attnul nullifier]
        PA --> R[referrals set:\ncommitment receipt]
        PA --> C[proven ++\nattestationsVerified ++]
    end
    P --> PA
```

In words: the issuer commits (attributes bound to a holder, published on ledger);
the holder proves (recomputes the same commitment privately, shows it is published,
burns a per-trial nullifier, and satisfies the trial's typed predicate); anyone can
verify (ledger membership of the attestation, the nullifier in `spent`, the public
counters). The verifier learns **that** an attested, qualifying holder proved —
never which holder, never the attributes.
