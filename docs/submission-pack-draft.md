# COHORT — Wave-3 Submission Pack (DRAFT COPY)

Squad E / E3. Status: DRAFT — copy-paste-ready Akindo submission fields. The
owner submits himself; this file is draft copy only. Every hard fact traces to
`docs/what-changed.md` (same directory). Anything not yet available is an
explicit `[TBD]` or `[FILL AFTER DEPLOY]` placeholder — do not paste the form
until every placeholder is filled.

## 1. Project name

COHORT

## 2. One-liner

Prove you qualify for a clinical trial without handing over your medical record.

## 3. Description (long)

COHORT is a privacy-preserving recruitment rail for clinical trials on Midnight
Preprod. Today, finding out whether you qualify for a trial means handing a full
medical record — diagnosis, medications, labs — to every site's screener before
anyone gives you a yes-or-no answer. COHORT inverts that flow: the patient
learns whether they qualify, the trial site gets a cryptographic
qualification, and no medical record changes hands at any step.

How it works:
- **Discover** — browse a hand-mapped catalog of 12 recruiting studies
  (ClinicalTrials.gov API v2), each reduced to typed criteria with an explicit
  list of what the circuit cannot cover.
- **Private match** — the patient enters age and condition/medication flags
  locally; nothing leaves the device; the local preview is labeled *not a
  proof*.
- **Prove** — the eligibility circuit proves in-browser; the patient approves
  in the wallet. The chain sees only a trial-scoped nullifier, a blinded
  referral commitment, and a counter — no age, no condition, no record.
- **Verify** — the trial site checks the proof against the official indexer.

Wave-3 progress (this resubmission):
- **Resurrected reads:** the official Preprod indexer/RPC was shut down (HTTP
  410); all read paths move to Blockfrost Preprod with honestly labeled
  provenance, and a regression test fails the build if any dead host returns.
- **Issuer-attested circuits (undeployed):** a demo issuer attests the
  patient's attribute bundle first; the patient proves over attested
  attributes (`attest` / `attestWithAttributes` / `proveAttested`,
  program-scoped nullifiers). Specified, full-ZK compiled, verifier keys pinned
  — deploy pending; the issuer gate is honestly labeled demo-grade.
- **Product depth:** 12-trial hand-mapped catalog (was 2), browser-local FHIR
  R4 / Synthea synthetic-record import, wallet matrix (GeroWallet primary, 1AM
  fallback, Lace fail-closed), Supabase public-catalog cache with catalog
  versioning.

What we do not claim: not HIPAA compliance, not medical certification, not
enrollment. No real patient data anywhere in the build; the demo issuer is not
a hospital. The Wave-1 `proveEligible` rail is live on Preprod (contract
`1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`, verifier
SHA `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`).

## 4. Links

| Field | Value |
|---|---|
| Repository | `[TBD]` |
| Live demo | `[TBD]` |
| Demo video (≤4 min) | `[FILL AFTER DEPLOY]` |
| Pitch deck | `[TBD]` |
| Preprod explorer | https://preprod.midnightexplorer.com/ |
| Wave-1 contract (Preprod) | `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc` |
| Wave-3 contract (Preprod) | `[FILL AFTER DEPLOY]` |
| Indexer (truth, Blockfrost Preprod) | https://midnight-preprod.blockfrost.io/api/v0 (requires `?project_id=`) |

## 5. What-changed summary (for the resubmission field)

Since Wave 1: (1) resurrected all Preprod reads onto Blockfrost after the
official indexer/RPC shutdown, with honest provenance labels and a dead-URL
regression test; (2) added hash-native issuer-attested eligibility circuits
(`attest`, `attestWithAttributes`, `proveAttested`, program-scoped
nullifiers) closing Wave 1's self-assertion gap — specified, full-ZK compiled,
verifier keys pinned, **undeployed** pending owner-confirmed deploy; (3)
product depth: 2→12 hand-mapped recruiting-trial catalog, browser-local
synthetic FHIR import, wallet matrix (GeroWallet primary, 1AM fallback, Lace
fail-closed), Supabase catalog cache; (4) communication: ≤4-minute word-for-word
video script and a 12-slide deck outline with every number sourced and every
unfilled claim marked as a placeholder. Site verification console, truth gate,
and the demo-issuer ceremony deploy are in progress — marked as such, not as
shipped.

## 6. Wave-3 deploy block (paste these when available; leave blank otherwise)

- New-circuit Preprod contract address: `[FILL AFTER DEPLOY]`
- Issuer-ceremony tx hash: `[FILL AFTER DEPLOY]`
- `attest` tx hash: `[FILL AFTER DEPLOY]`
- `proveAttested` tx hash: `[FILL AFTER DEPLOY]`
- New verifier SHAs (measured, pinned in `scripts/judge-pins.mjs` — undeployed):
  - `attest`: `93f5b746871ad5eb5579e675e1913dc7b5aa830e0cea8ba602aa4e27f1c91303`
  - `attestWithAttributes`: `84c89c88fa62c3a1cea7ffbbc67d4f0d0036bc844aff6f74e7d34413047320f4`
  - `proveAttested`: `a457129525ef3e0458dde077872df02c98d4647d39f278b2d0883f7b11275e13`
- Demo video URL: `[FILL AFTER DEPLOY]`

## 7. Checklist before the owner submits

- [ ] Every `[TBD]` / `[FILL AFTER DEPLOY]` above is filled or deleted.
- [ ] Video filmed and uploaded; URL pasted into §6.
- [ ] New-circuit contract deployed on Preprod; address + tx hashes pasted into §6.
- [ ] `docs/what-changed.md` re-read: every claim still traces to a file/commit.
- [ ] No users, pilots, partners, or outcomes claimed anywhere in the form.
