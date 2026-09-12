# Criteria → circuit feasibility

Date: 2026-09-12
Method: three real studies, manual mapping. No LLM parser.

## Typed schema used by Wave 1 COHORT

```
ageYears: Uint<8>
sex: Uint<8>          // 0 unknown, 1 male, 2 female  (compiled out if unused)
condition: Boolean    // one sponsor-chosen flag
medication: Boolean   // one exclusion flag
```

Compiler fact: unused `wSex` was stripped from generated witnesses. Include a criterion or drop the witness.

## Study mapping

### NCT07153614 (opioid-sparing surgery)

| Criterion | Easy typed? | Ambiguous? | Physician? | Impossible in ZK safely? | Shape |
|---|---|---|---|---|---|
| Age 18–80 | yes | no | no | no | range |
| Sex ALL | n/a | no | no | no | ignore |
| HV false | maybe | “healthy” vs cancer surgery | yes | as boolean only if sponsor defines | boolean |
| Open surgery for listed cancers | no | procedure + diagnosis | yes | without EHR procedure codes | hasCode |
| English speaking | no | fluency | yes | self-attest only | boolean |
| Midline incision | no | operative plan | yes | future | boolean |
| Negative pregnancy test | partial | timing, test type | yes | temporal | boolean + time |
| Chronic opioid <90d | no | fill history | yes | temporal + drug class | exclusion history |
| Anticoagulants <7d | no | drug list | yes | drug interaction/time | exclusion |
| Nerve-block contraindications | no | anatomy/infection | yes | clinical reasoning | unstructured |
| Cognitive impairment / consent | no | capacity | yes | cannot encode ethically as a silent flag | stop |

**MVP subset:** age range + not-HV + one diagnosis flag. Everything else is site screening after proof.

### NCT06007248 (IR-CAD)

Almost none of the protocol is a Boolean. Two age windows (case vs control), pregnancy, PCI recency, CCS class, labs, immunosuppression. **Not Wave 1.**

### NCT04200963 (IK-175)

Age ≥18 only typed. ECOG, measurable disease, washouts, QTc, autoimmune, HIV CD4 — **physician / EHR**. **Not Wave 1.**

## Counts (approximate, three studies)

| Bucket | Count |
|---|---|
| Easy typed (age/sex/HV) | ~4 |
| Boolean self-attest plausible | ~6 (language, incision, HV) — ethically weak |
| Ranges | age, QTc, CD4, steroid mg — need numeric witnesses |
| Exclusions | many |
| Temporal history | opioid 90d, anticoagulant 7d, washouts, PCI 12±6 months |
| Drug interactions | anticoagulants, live vaccines, AHR inhibitor |
| Complex reasoning | “investigator opinion”, “adequate organ function”, “suitable” |
| Must remain off-circuit | capacity to consent, investigator suitability |

## Feasible MVP

Public trial row: NCT id hash + `minAge` + `maxAge` + optional `requireCondition` + optional `forbidMedication`.
Private witness: synthetic FHIR-normalized age + one ICD flag + one med flag.
Human review after eligible=true.

Do **not** ship LLM free-text → Compact.
