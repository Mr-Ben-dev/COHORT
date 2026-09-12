# ClinicalTrials.gov API v2

Date: 2026-09-12
Live calls from this Windows host. No API key.

## Endpoint

- Base: `https://clinicaltrials.gov/api/v2/`
- Study list: `GET /studies`
- One study: `GET /studies/{nctId}`
- Auth: none
- Version header etag: `883b003/0.34.1`
- Pagination: `nextPageToken` present on list queries
- Schema: `protocolSection.identificationModule`, `eligibilityModule`

## Typed eligibility fields observed

| Field | Present |
|---|---|
| `eligibilityCriteria` | long free text |
| `healthyVolunteers` | boolean |
| `sex` | ALL / ... |
| `minimumAge` | e.g. `18 Years`, `45 Years` |
| `maximumAge` | sometimes absent (NCT04200963) |
| `stdAges` | ADULT, OLDER_ADULT |

## Studies saved

| NCT | Title | Typed age/sex | Free-text density |
|---|---|---|---|
| NCT07153614 | Perioperative opioid sparing / chemo timing | 18–80, ALL, HV false | High: opioid history, pregnancy, anticoagulants, nerve-block contraindications, English, incision type |
| NCT06007248 | IR-CAD case-control | Control 45–64; case ≥18; ALL; HV false | Extreme: PCI timing, CCS angina, ESR/CRP, autoimmune, malignancy |
| NCT04200963 | IK-175 + nivolumab solid tumors | ≥18, no max, ALL, HV false | Extreme: ECOG, organ function, washouts, QTc, autoimmune, HIV CD4 |

List search `query.term=diabetes` and `hypertension` both returned NCT06007248 first — **do not trust term search as unique**. Fetch by NCT id.

## Deterministic circuit mapping

Only `sex`, `minimumAge`, `maximumAge`, `healthyVolunteers` are immediately typed. Everything else is prose. Wave 1 must hand-map a subset. See `criteria-feasibility.md`.

Rate limits: not published in the responses we saw. Be polite; we fetched 4 small JSON documents.
