# COHORT — Wave-3 Pitch Deck Outline

Squad E / E2. Status: DRAFT for the Wave-3 pitch deck. Every hard number traces to `~/workspace/cohort-wave2/DOMAIN-RESEARCH.md` or the repo; anything unverified or not-yet-deployed is marked `[FILL AFTER DEPLOY]` or `[TBD]`. Slides never mention any other project, repo, or person.

---

## Slide 1 — Title

- **Headline:** COHORT — Prove you qualify for a clinical trial without handing over your medical record.
- **Tagline:** The patient proves eligibility locally. The chain verifies. Nobody holds the record.
- **Sub-line:** Privacy-preserving trial eligibility proofs on Midnight Preprod · Wave-3 build
- **Visual:** one-line flow strip (trial rules → private proof → on-chain verification) as a teaser for slide 6.

**Speaker notes (2–3 sentences):** COHORT is a recruitment rail, not another trial-finder: the patient learns whether they qualify for a trial and the trial site gets a cryptographic qualification — with no medical record changing hands at any step. Today we will show why recruitment fails on trust, how Midnight moves that trust from contracts to cryptography, and what is live on Preprod.

---

## Slide 2 — The problem (trials fail on recruitment, not science)

- ~80% of clinical trials are delayed or closed because of problems with recruitment (Antidote compilation).
- 9 out of 10 trials ultimately double their original timeline to meet enrollment goals (Antidote).
- 11% of research sites fail to enroll a single patient; half of sites under-enroll relative to expectations (Antidote; Applied Clinical Trials 2026).
- In oncology: fewer than 5% of adult cancer patients participate in trials (NCODA).
- The flow that causes it: today's matching forces a patient to hand a full medical record — diagnosis, medications, labs — to every site's screener *before* learning whether they even qualify.

**Speaker notes:** The science is not the bottleneck; the funnel is. To discover one eligible trial, a patient currently surrenders the most stigmatizable facts of their life to a coordinator they have never met — and does that once per site. Sources: Antidote recruitment-statistics compilation; Applied Clinical Trials; NCODA — all cited in DOMAIN-RESEARCH.md §1.

---

## Slide 3 — The cost (verified numbers only)

- ~$500,000 per day in unrealized prescription sales + ~$40,000 per day in direct trial operating costs (Tufts CSDD, Ken Getz, *Therapeutic Innovation and Regulatory Science*).
- Up to $8,000,000 per day for blockbuster products (2021 industry reports) — i.e., the range spans niche to blockbuster.
- Screen failure costs sponsors ~$1,200 per failure on average (Antidote); recruiting one participant averages ~$6,500, replacing a dropout ~$19,500 (Clinical Leader).
- 15–40% of patients exit trials before completion; roughly 25–30% average dropout (Clinical Leader; 2026 estimates).
- 31% of trial participants were somewhat or very concerned about having their personal information stolen (Mello et al.).
- Re-identification rates above 99% for "anonymized" patient records using only 15 demographic attributes (*Nature Communications* 2019) — anonymized screening data is not anonymous.

**Speaker notes:** Two money bleeds: each delayed day and each failed screen. But the second row is the wedge — patients know data leaks, records de-identify poorly, and sponsors themselves warn that data-sharing fears chill participation, so privacy is not a nice-to-have, it is the enrollment lever. Sources for every figure: DOMAIN-RESEARCH.md §1 (Tufts CSDD; syncora.com/biopharmadive 2021; Antidote; Clinical Leader; Mello et al. via ScienceDaily 2018-06-06; Nature Communications 2019 via AffixIO WP-025).

---

## Slide 4 — Why privacy is the bottleneck (not a feature)

- The question a site needs answered is binary: does this patient satisfy our typed criteria? The record is evidence, never the answer — yet today's process ships the whole record to get one bit.
- 31% of participants already fear information theft (Mello et al.); 37% of Europeans surveyed believed data sharing may reduce participation rates (pan-European survey, n=20,882).
- Investigators and sponsors themselves worry participants' privacy cannot be adequately protected given demonstrated re-identification attacks — i.e., the industry names privacy as an enrollment risk.
- Any server that sees the record to compute eligibility is a honeypot wrapped in a promise — and promises do not prevent breaches (per DOMAIN-RESEARCH.md §5; source URL for the cited ~190M-record incident is [TBD], do not quote the number on the slide).

**Speaker notes:** Three sides of the same bottleneck: patients hesitate to hand over records, advocacy and trial-finder platforms stake their whole mission on patient trust, and sponsors lose money on the delays and dropouts that hesitation produces. Until the record stops moving, recruitment stays stuck — so privacy here is the unlock, not a checkbox.

---

## Slide 5 — The solution (COHORT)

- **DISCOVER** — browse recruiting studies; public trial rules from ClinicalTrials.gov API v2, reduced to a hand-mapped typed subset. `[TBD] 12-trial catalog — Wave-3 in progress; 2 mapped today (NCT04200963, NCT07153614)`
- **PRIVATE MATCH** — the patient enters age / mapped flags locally; nothing leaves the device; local preview is labeled *not a proof*.
- **VERIFY** — 1AM wallet connects; the eligibility circuit proves in-browser (WASM); the patient approves in the wallet toolbar.
- **QUALIFICATION** — the official indexer confirms the transaction: a trial-scoped nullifier, a blinded referral commitment, and a counter go public — not an age, not a condition, not a record.
- **CONTROLLED HANDOFF** — keep the result, share a public packet `{trialId, txHash, contractAddress, networkId}`, or open the official study listing. No live site inbox, no bounty, no invented outcomes.

**Speaker notes:** The inversion is the product: today the record travels to the verdict; COHORT sends the verdict without the record. Every "qualification" claim is backed by an indexer-confirmed Preprod transaction — a green UI badge alone never counts. Qualification means the proof landed on chain; it does not mean enrollment, medical truth, or HIPAA compliance.

---

## Slide 6 — How it works (typed predicate + ZK proof + issuer attestation)

- The trial's public rules (age bounds, condition/medication flags) become public circuit arguments bound to the served policy — user-typed bounds are rejected.
- The patient's facts stay as private witnesses on the device; the circuit asserts the bounds and writes only hashes and a counter to the ledger.
- Wave-3 delta: a hash-native issuer attestation (`attest` / `attestWithAttributes` / `proveAttested`) — a demo issuer signs the fact-set so the site can verify *who* asserted the facts, still without seeing them. Status: contract spec frozen in `CONTRACT/cohort.compact` design (STATUS.md §B1); ceremony and deploy `[FILL AFTER DEPLOY]`.
- **Diagram description (draw as 4 boxes, left to right):** Box 1 "Patient device" lists the private facts (age, condition flag, medication flag) behind a lock icon with the caption "never leaves". A thick arrow labeled "local zero-knowledge proof (WASM, 1AM)" goes to Box 2 "Midnight Preprod contract", which lists only "trial-scoped nullifier · referral commitment · proven counter". A thin arrow labeled "public packet" goes to Box 3 "Trial site console" showing "trialId + txHash + green check". Below, a separate dashed lane labeled "Demo issuer" shows one arrow into Box 1: "signs the fact-set (attestation), sees no record". Nothing in the diagram carries a diagnosis, age, or medication name in the clear.

**Speaker notes:** One sentence per box: the device holds the facts, the proof is computed locally so witnesses never cross the network, the chain stores only unlinkable hashes and a counter, and the site's console checks the proof against the official indexer. The new piece in Wave 3 is the issuer arrow: an attestation that the facts were asserted by a known issuer — again as a hash, never as plaintext.

---

## Slide 7 — Why Midnight (private witnesses + public integrity in one tx)

- Compact gives private witnesses and public ledger state in the *same* transaction — `disclose()` hashes may cross into ledger state while the values themselves never leave the prover.
- Dual ledger: public `spent` / `referrals` / `proven` on chain versus witnesses that never leave the patient's wallet process — no hosted proof-server, no vendor ever sees the facts (in-browser WASM proving via 1AM).
- Trust moves from legal contracts to cryptography: the site verifies a proof on-chain instead of trusting a platform's promise to handle PHI carefully.
- Pinned toolchain on Preprod (ledger 8): Compact 0.31.1 / language 0.23 / compact-runtime 0.16.0 / midnight-js 4.1.1 — compiled, hashed, and verified against the deployed contract (verifier SHA-256 `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`).
- Recorded test posture: 108 tests, 108 pass, 0 fail (last recorded full `npm test`, 2026-09-16) — do not inflate.

**Speaker notes:** On a general-purpose chain this needs an off-chain prover or a trusted server — either one recreates the exact honeypot we are removing. Midnight's programmable-privacy model is what lets the fact-set stay on the device while the integrity evidence is public and permanent in a single transaction.

---

## Slide 8 — Live proof (Preprod)

- **Network:** Midnight Preprod (ledger 8)
- **Contract address (Wave 1, `proveEligible`):** `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`
- **Explorer:** https://preprod.midnightexplorer.com/ — **Indexer (truth):** https://indexer.preprod.midnight.network/api/v4/graphql
- **Documented 1AM gold-path tx:** `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60` (NCT07153614, 2026-09-13; COMMITTED EVIDENCE in repo §18)
- **Wave-3 circuits (`attest*`, `proveAttested`) contract address:** `[FILL AFTER DEPLOY]` — new contract; Wave-1 address kept as evidence, never overwritten.
- **Wave-3 attestation txs / verifier SHA of the new circuit:** `[FILL AFTER DEPLOY]`
- **Site verification console (read path against the official indexer):** `[TBD] — Wave-3 in progress (Squad D, D2)`
- **How a judge re-runs it:** `npm run compile` → `npm test` → `npm run judge:verify` (no wallet, no secrets for the read path).

**Speaker notes:** Everything on this slide is either committed in the repo today or explicitly marked un-filled — we do not present Wave-3 circuits as deployed until their transactions exist on Preprod. The Wave-1 rail is independently reproducible: the judge CLI recompiles the exact toolchain, re-hashes the verifier, and reads the live indexer.

---

## Slide 9 — What changed since Wave 1 (Wave-3 delta)

- **Blockfrost migration:** indexer/RPC reads move from the legacy endpoints to Blockfrost Preprod (`midnight-preprod.blockfrost.io` API + WS + RPC) — `[TBD] cutover status; Squad A A1 running`.
- **Issuer-attested eligibility circuit (hash-native, demo issuer):** `attestationOf` / `attest` / `attestWithAttributes` / `proveAttested`, `attestations` Set, `attestationsVerified` counter — answers the honest Wave-1 gap ("facts are self-attested") without putting any fact on chain — `[FILL AFTER DEPLOY: ceremony tx + new contract address]`.
- **Site verification console:** a no-wallet read path — a site pastes trial id + tx hash and verifies qualification against the official indexer; no PHI anywhere in the flow — `[TBD] Wave-3 in progress (Squad C, C2; Squad D, D2)`.
- **12-trial catalog:** hand-mapped typed subsets from ClinicalTrials.gov API v2, up from 2 today (NCT04200963, NCT07153614) — `[TBD] Wave-3 in progress (Squad D, D1)`.
- **Proof-of-execution wiring:** `attestationsVerified` counter flows API → UI with live/sample badges labeled honestly — `[TBD] waits on new contract (Squad C, C4)`.

**Speaker notes:** Wave 1 proved the patient rail end to end; Wave 3 closes the loop on the site's side — a known issuer can stand behind the facts, and the site gets a verification console that touches no patient data. Anything we cannot show live yet is labeled as in-progress, not as shipped.

---

## Slide 10 — Trust boundary (what the DB sees vs what stays private)

- **Diagram description (draw as two columns with a firewall between):** Left column header "STAYS PRIVATE — device / wallet only": age, condition flag, medication flag, wallet secret, blinding factor, AES-GCM profile vault — each row carries a lock icon and the caption "never POSTed, never logged". A bold horizontal bar in the middle labeled "ZK proof boundary — only hashes cross". Right column header "GOES PUBLIC — ledger / backend DB": trial-scoped nullifier, referral commitment, `proven` counter, tx hash, contract address, circuit name, network id. Under the backend box, a red reject stamp: "`POST /api/referral` with `age`, `condition`, `fhir`, `witness`, `secret`, `blind`, or `profile` → HTTP 400, never echoed, never stored". A chain-observer eye icon at the bottom with the honest footnote: "observer still sees circuit name, contract, hashes, timing — this is not zero metadata".
- The backend is a public-metadata cache and artifact host (`/zk` keys), never a record store; `GET /api/public-state` is labeled `notIndexerTruth` — truth is the official indexer.
- Explicit non-claims (on the slide, small): not HIPAA compliance, not EHR authenticity (Wave-1 facts are self-attested; issuer attestation is Wave 3), not full-protocol eligibility, not enrollment.

**Speaker notes:** Privacy here is defined as what an observer can correlate, not whether one field is hidden. The single most important line on the slide is the 400: our own API refuses private fields by name, so even a compromised backend has nothing to leak. And we say the honest limits out loud — a lying prover can satisfy the circuit with invented facts, which is exactly the gap the Wave-3 issuer attestation closes.

---

## Slide 11 — Roadmap

- **Now → Wave-3 close:** finish the four deltas on slide 9 (Blockfrost cutover, issuer ceremony + new Preprod contract, site console, 12-trial catalog); every artifact lands with `[FILL AFTER DEPLOY]` tx hashes and verifier SHAs in the repo.
- **Pilot conversations:** patient-facing trial-finder platforms and advocacy networks are the researched first door (they already run matching funnels and their currency is patient trust) — candidate organizations researched in DOMAIN-RESEARCH.md §4; **no relationship, endorsement, or interest is claimed or implied** — the goal is one design partner running the ZK rail against their existing funnel.
- **Mainnet:** only after the official support matrix confirms the toolchain on ledger 8 — a *new* Mainnet address of the then-current circuit; Preprod state is never transplanted; production monitoring and incident rollback (prove flag off; contract immutable) before any Mainnet claim.
- **Beyond:** issuer program (real issuers behind attestations), FHIR ingestion spike (in-browser parsing only, no PHI leaves the device), full-protocol criteria mapping.

**Speaker notes:** Sequencing is deliberate: prove the trust boundary on Preprod, earn one design partner in the patient-trust channel, and only then touch Mainnet — a second entry is never a rename of this one. The pilot criterion is a named organization willing to run the rail, not a logo on a slide.

---

## Slide 12 — Ask

- **The grant:** `[TBD] — grant amount to be set by the proposer; do not quote a number on the slide until confirmed.`
- **What it funds (no amounts assigned until the grant is set):**
  1. Preprod → audited Mainnet deployment track: ceremony, independent verifier re-hash, monitoring and incident rollback runbook.
  2. Site verification console → production grade: no-wallet read path, honest live/sample badges, site onboarding docs.
  3. 12-trial catalog → maintained mapping pipeline against ClinicalTrials.gov API v2 with mapping disclaimers.
  4. Issuer program: demo issuer → first real issuer integration, key-ceremony documentation for judges.
  5. One pilot design partnership: integration support for a patient-facing trial-finder or advocacy network (no relationship claimed today).
- **What the grant does not fund:** patient data acquisition, any PHI handling, marketing spend, or a second entry.

**Speaker notes:** The money buys one thing: the distance between a proven Preprod rail and a Mainnet-grade recruitment rail that a real trial-finder can run without ever holding a record. Every deliverable is public, verifiable, and labeled — judges can re-run the whole chain of evidence from the repo.

---

## Appendix — number traceability (do not present; speaker prep only)

| Number used | Source in DOMAIN-RESEARCH.md | Original source URL |
|---|---|---|
| ~80% delayed/closed on recruitment | §1 Enrollment failure | https://www.antidote.me/blog/25-useful-clinical-trial-recruitment-statistics-for-better-results |
| 9/10 double timeline; 11% sites zero patients | §1 | same Antidote compilation |
| ~80% missed timelines (2012); 50% sites single/under-enrolled | §1 | https://www.appliedclinicaltrialsonline.com/view/designed-performance-recruitment-outcome-operational-failure |
| 55% prematurely terminated | §1 | https://clinicaltrialrisk.org/clinical-trial-design/why-clinical-trials-fail-top-reasons-overviewed/ |
| 76% RCTs discontinued (systematic review) | §1 | https://www.mdpi.com/2912888 |
| <5% adult cancer patients in trials | §1 | https://ncoda.org/news/the-challenge-of-patient-enrollment-in-clinical-trials/ |
| $600k–$8M/day delay | §1 Cost of delay | https://syncora.com/blogs/site-activation-delays-impacting-clinical-trial-timelines/ and https://www.biopharmadive.com/spons/need-to-accelerate-study-execution-in-the-face-trial-complexity-conside/543982/ |
| ~$500k/day sales + ~$40k/day ops | §1 Cost of delay | https://www.appliedclinicaltrialsonline.com/view/how-much-does-a-day-of-delay-in-a-clinical-trial-really-cost- (Tufts CSDD, Ken Getz) |
| $40k/day ops; $600k–$1.3M/day blockbuster opportunity | §1 Cost of delay | https://vsokolov.quarto.pub/clinos/06-economics.html (Smith, DiMasi, Getz 2024) |
| $1,200/screen failure | §1 | Antidote compilation |
| $6,500/participant; $19,500/dropout replacement | §1 | https://www.clinicalleader.com/doc/understanding-clinical-trial-patient-attrition-0001 |
| 15–40% dropout; 25–30% average | §1 | Clinical Leader; https://decentrialz.com/blog/why-patients-drop-out-of-clinical-trials-mid-study |
| 31% fear info theft | §1 Privacy barrier | http://www.sciencedaily.com/releases/2018/06/180606173747.htm (Mello et al.) |
| 37% believe sharing reduces participation (n=20,882) | §1 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7547503/ |
| >99% re-identification, 15 attributes | §1 | https://www.affix-io.com/whitepapers/hipaa-clinical-ai-zk/paper.pdf (Nature Communications 2019) |
| 108 tests pass (2026-09-16) | repo README §19 | — |
| Contract, txs, verifier SHA, catalog NCTs | repo README §1, §14, §18, §21 | — |
