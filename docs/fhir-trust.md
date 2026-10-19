# FHIR import — trust boundary

**Status:** SQUAD D3, 2026-10-19 · **Data:** synthetic only (hand-written bundles +
public Synthea synthetic data; no real patient data anywhere in this flow)

## What the flow is

1. A FHIR R4 Bundle reaches the patient through one of three browser-side
   sources: a bundled static demo (`web/public/fhir-demo/*.json`), an uploaded
   file (read via FileReader), or the open SMART R4 test server
   (`https://r4.smarthealthit.org`, public Synthea synthetic data, no auth).
2. `web/src/lib/fhir-import.mjs` parses the Bundle **in memory, in the
   browser**, and extracts the eligibility path map:
   - `Patient.birthDate` → age (whole years)
   - `Condition.code` (SNOMED-CT, `clinicalStatus=active` only) → diagnosis flags
   - `Observation.code` (LOINC) + `valueQuantity` → labs
   - `MedicationRequest` (RxNorm, `status=active`) → medication flags
3. The extracted attributes are shown as a patient-facing eligibility checklist,
   then handed to `requestAttestation(attributes)` — the clean handoff into the
   attestation flow (demo issuer + circuit wiring, separate worker).

## The boundary, stated plainly

| Party | Sees | Does NOT see |
|---|---|---|
| Browser (patient device) | The full bundle, parsed locally | — |
| COHORT backend / API | **Nothing.** The parser performs zero network I/O; this is asserted in code comments and pinned by `TESTS/fhir-import.test.mjs` (fetch is stubbed to throw; the module source is statically scanned for network APIs) | The bundle, the attributes, the patient |
| ClinicalTrials.gov pipeline | Public trial metadata only | Patient data (never enters that pipeline) |
| SMART R4 test server | Only its own public synthetic records when the user clicks "live server" | The user's own record — nothing is uploaded to it |
| Demo issuer | **The attested attributes in the clear** (age, condition flag, medication flag) — disclosed, demo-grade | The full bundle, non-attested fields |

### Disclosures that must not be softened

1. **The demo issuer sees attested attributes in the clear.** This is
   acceptable for synthetic data and mirrors the hospital's existing role with
   real data (the provider already holds the record). It must be disclosed in
   the demo script and the submission — "private" here means the full record
   never leaves the device and only the attested attributes reach the issuer.
2. **Salt is load-bearing.** The attestation pipeline commits salted hashes of
   `(age, condition, medication)`. Age is ~8 bits, the flags are 2 bits — an
   unsalted commitment of such a small space is brute-forceable in milliseconds.
   Every commitment must include a fresh per-holder salt (the B1 circuit takes
   `holderSecret` + `nonce`); any demo that drops the salt must be labeled broken.
3. **Bundled static is the default.** The free SMART R4 server can reset; the
   judge path must work fully offline from `web/public/fhir-demo/`. The live
   server and SMART App Launcher are optional tabs, never the default.
4. **Upload tab parses locally.** "Upload a bundle" reads with FileReader and
   never transmits — users should not be asked to upload real records in the
   demo, and the UI carries a SYNTHETIC-DATA-ONLY badge.

## What is NOT claimed

- We do not claim the path map covers arbitrary clinical criteria — unmapped
  SNOMED/LOINC/RxNorm codes surface as warnings or are ignored with a visible note.
- We do not claim Synthea records are realistic edge cases — the research notes
  Synthea codes social determinants as active Conditions; the parser filters to
  `clinicalStatus=active` but this is demo-grade, not clinical validation.
- We do not claim end-to-end privacy of the demo: the attestation pipeline's
  real guarantees come from the Wave-3 circuit (`attestations: Set<Bytes<32>>`
  + issuer-gated `attest()`), not from this import UI.
