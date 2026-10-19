# COHORT — Pilot Partner Brief (one page)

**For the owner to use in outreach. No relationship, endorsement, or interest is claimed or implied for any organization named below — these are researched candidates only.**

## The one sentence

**Prove you qualify for a clinical trial without handing over your medical record.**

## Three facts that survive scrutiny

1. **Real contract on Midnight Preprod.** `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc` — verifier key SHA-256 `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`, byte-identical across compile and chain (see `docs/verifier-keys.md`).
2. **Real zero-knowledge proofs, indexer-verified.** 1AM in-browser WASM proving; documented gold-path transaction `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60` (trial NCT07153614, 2026-09-13). The chain receives a trial-scoped nullifier, a blinded referral commitment, and a counter — never an age, never a condition flag, never a record.
3. **ClinicalTrials.gov-anchored catalog.** Trial rules come from ClinicalTrials.gov API v2, reduced to hand-mapped typed subsets — 12 recruiting trials today (3 oncology, 3 cardiology, 2 diabetes, 2 neurology), each with a stated list of criteria the circuit does *not* cover. Live at https://cohort-web-orcin.vercel.app, API at https://cohort-y4zr.onrender.com.

## Honest limitations (say these before they ask)

- **The issuer is a demo key, not a hospital.** Wave-1 eligibility facts are self-asserted by the patient; the issuer-attested circuits (`attest` / `proveAttested`) are compiled and verifier-pinned, not yet deployed.
- **Not HIPAA compliance, not medical certification, not enrollment.** A proof says a computation ran correctly over committed attributes — it does not say the attributes are medically true, and sites still run their own screening.
- **Synthetic data only.** No real patient records anywhere in the project.

## Candidate pilot partners (verified 2026-10-19 from each organization's public site)

### 1. CISCRP — ciscrp.org
**What they do:** 501(c)(3) nonprofit dedicated to engaging patients and the public as partners in clinical research; runs a trial-search tool and community education programs. Their stated currency is patient trust in research.
**Why COHORT fits:** CISCRP's entire mission is trust — yet every trial search today funnels patients toward handing records to strangers. A "prove eligibility without sharing your record" rail lets them offer matching that is structurally incapable of holding PHI, which is a stronger trust story than any privacy policy.
**The ask:** a 20-minute conversation about piloting the rail against their trial-search funnel — no commitment, just a design conversation.

### 2. Antidote — antidote.me
**What they do:** Clinical-trial patient-recruitment company; standardizes trial data into patient-friendly matching and sells recruitment services to sponsors.
**Why COHORT fits:** They already run the matching funnel at scale, which means they already carry the privacy liability of ingesting patient health profiles. ZK eligibility proofs would let them pre-screen patients *without* ingesting the underlying records — cutting liability while keeping the funnel.
**The ask:** a 20-minute conversation about a pre-screening pilot on one therapeutic area — no commitment.

### 3. TrialX — trialx.com
**What they do:** Clinical-trial recruitment platform (operating since 2008): trial finder, digital pre-screeners, volunteer registry, referral management for sponsors, sites, and academic medical centers.
**Why COHORT fits:** Their pre-screeners collect health profiles today and route qualified referrals to sites. A ZK rail slots directly into that existing flow — same pre-screener UX, but the site receives a verified proof instead of a health profile, and TrialX never stores what it never sees.
**The ask:** a 20-minute conversation about wiring the prover behind one existing pre-screener — no commitment.

### 4. NORD — rarediseases.org
**What they do:** The leading US rare-disease advocacy nonprofit; runs trial listings, patient-assistance programs (including travel/lodging for trial participation), and policy advocacy for 30M+ Americans with rare diseases.
**Why COHORT fits:** Rare-disease populations are tiny, so re-identification risk is highest exactly where NORD works — a "de-identified" record of one of 200 patients worldwide is not anonymous. Patients with stigmatized genetic conditions need eligibility checks that reveal nothing, which is precisely what the rail guarantees.
**The ask:** a 20-minute conversation about a rare-disease trial-matching pilot — no commitment.

### 5. Lazarex Cancer Foundation — lazarex.org
**What they do:** Nonprofit helping advanced-stage and underserved cancer patients access FDA-approved clinical trials; runs the IMPACT program (trial education + financial assistance for participation costs).
**Why COHORT fits:** They serve patients with the most sensitive diagnoses and the least institutional trust — the exact population for whom "hand us your record to check eligibility" is the highest barrier. A private eligibility check lowers the fear barrier to first contact with a trial.
**The ask:** a 20-minute conversation about offering the private checker alongside their trial navigation — no commitment.

### 6. ResearchMatch — researchmatch.org
**What they do:** NIH-funded nonprofit volunteer registry (Vanderbilt-led, 284 participating institutions) connecting research volunteers with researchers; free, explicitly privacy-framed, consent-based matching at national scale.
**Why COHORT fits:** Their model *is* consent-based matching — ZK eligibility proofs are the cryptographic version of the promise they already make to volunteers. "We match you without seeing your data" turns their privacy framing from policy into mathematics.
**The ask:** a 20-minute conversation about a ZK eligibility layer for volunteer-trial matching — no commitment.

### 7. ClinicalTrials.gov (NLM/NIH) — clinicaltrials.gov
**What they do:** The world's registry of clinical trials; COHORT's trial rules already come from their API v2.
**Why COHORT fits:** They are the canonical criteria source but offer no privacy-preserving matching layer. A ZK rail built on their API extends their public mission (access to trials) without touching their data model — it is additive, not competitive.
**The ask:** a 20-minute conversation about what a privacy-preserving matching layer on top of the registry could look like — no commitment.

## What a pilot looks like (concrete, small, reversible)

1. **Their trial list → our catalog.** They name 3–5 recruiting trials their community cares about; we hand-map the typed eligibility subsets (the same ~30–45 min/trial process behind today's 12-trial catalog), each with a stated unsupported-criteria list.
2. **Their community tries the prover.** Patients open the site, enter facts locally (nothing leaves the device), and generate a ZK eligibility proof in the browser. The partner sees only: trial ID, proof transaction hash, verified/not-verified.
3. **They judge the trust story.** Does "we never see your record" change their community's willingness to engage? That is the pilot's success metric — not enrollment, not a contract.

## The single ask (use verbatim to close)

> "I'm not asking for a commitment, a logo, or an endorsement — just 20 minutes to show you a working zero-knowledge eligibility prover on real trial criteria, and to hear whether it would matter to your community. If it's not useful, I'll have learned something in 20 minutes."
