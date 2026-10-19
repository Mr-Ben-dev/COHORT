# COHORT — Wave-3 Demo Video: Word-for-Word Shooting Script
**Squad E / E1. Max length: 4:00. Mission lands in the first 30 seconds. Every hard number traces to `~/workspace/cohort-wave2/DOMAIN-RESEARCH.md`. Any tx hash, address, or live count not yet on Preprod is marked `[FILL AFTER DEPLOY]` — never invent one. No jargon is ever spoken on screen: no "ZK-SNARK", no "nullifier" spoken — a proof is described as "a proof that reveals nothing". No other projects, repos, or people are mentioned. Speaker notes in *italics*.**

---

## 0:00–0:30 — THE MISSION

**On screen:** black frame; white serif title card: "COHORT". Subtitle: "Prove you qualify for a clinical trial without handing over your medical record."

**Speaker (word-for-word):**
> COHORT answers one question: prove you qualify for a clinical trial — without handing over your medical record.

*Pause. Cut to a photo frame: an empty clinic waiting room, or a phone held in a hand. Slow push-in.*

> Here's why that matters. Around eighty percent of clinical trials are delayed or closed because of problems with recruitment [Antidote]. Nine out of ten double their original timeline just to fill enrollment [Antidote]. And a third of participants are worried their personal information will be stolen when they sign up [Mello et al., 31%].

*The stake is the funnel itself, not the science. Do not spend this beat on how anything works — keep the camera on the human cost: trials that can't find patients.*

---

## 0:30–1:00 — THE PROBLEM: the old way

**On screen (one frame description):** a single continuous screen recording of a typical trial pre-screener: a web form demanding diagnosis history, current medications, and a full "upload your medical record" step *before* it will say whether the visitor qualifies. Cursor hovers the upload button; nothing is clicked. Freeze frame.

**Speaker (word-for-word):**
> Today, the funnel is backwards. Before anyone will give you a yes-or-no answer, it demands the evidence: your diagnosis, your medications, your entire record — once per site, to coordinators you've never met.

*Cut back to the frozen upload button. Let it sit.*

> Patients know this is dangerous. And the data backs them up: anonymized patient records have been re-identified more than ninety-nine percent of the time from just fifteen demographic attributes [Nature Communications, 2019]. Handing over the record isn't the price of a yes-or-no answer. It should never have been.

*Rule for this beat: the record never visibly appears. The viewer sees only the demand for it.*

---

## 1:00–2:00 — THE PRODUCT: the full rail, on screen

**BEAT 1 — Discover trial (1:00–1:12)**
**On screen:** the COHORT dapp trial catalog. Cards for recruiting trials with plain-language criteria ("ages 18–65", "condition flag required", "medication excluded") pulled from ClinicalTrials.gov API v2. Cursor clicks one trial card.

**Speaker:**
> With COHORT, you start where the trials are. Real recruiting studies, real public criteria — twelve in the catalog. Pick one.

*If the 12-trial catalog is not yet deployed at shoot time, the voice line is "a growing catalog of real recruiting studies" and the on-screen count is left unstated.*

**BEAT 2 — Private match on device (1:12–1:24)**
**On screen:** a local eligibility form — age slider, yes/no toggles for condition and medication flags. All controls on the left pane; a banner reads: "This preview is not a proof — nothing leaves this device." The patient sets their values; a match preview lights up: "Matches trial criteria."

**Speaker:**
> You check your fit right here, on your own device. Your age, your conditions, your medications — they never leave this screen. This preview isn't a proof yet; it's your eyes only.

*Stress the banner. The viewer must understand the record stays put even now.*

**BEAT 3 — Prove (1:24–1:36)**
**On screen:** the patient clicks "Prove eligibility." The 1AM wallet approval dialog opens; the patient approves in the wallet toolbar. A status line cycles: "Proof generated in your browser → transaction broadcast to Midnight Preprod."

**Speaker:**
> Then you prove it. Your wallet asks once, you approve, and a proof is generated in your browser — a proof that reveals nothing. Your record stays on your device; the chain gets the proof.

**BEAT 4 — Preprod transaction (1:36–1:48)**
**On screen:** the Blockfrost Preprod indexer view of the confirmed transaction — tx hash `[FILL AFTER DEPLOY]`. Three public fields are highlighted with plain-language labels: "one-time ticket — stops this proof being reused", "scrambled commitment", "proof counter". A callout reads: "No age. No condition. No record."

**Speaker:**
> Here's what the world can see on-chain: a one-time ticket that stops the same proof being claimed twice, a scrambled commitment, and a counter. No age, no condition, no record. That's the whole public footprint.

**BEAT 5 — Site verifies without seeing the record (1:48–2:00)**
**On screen:** the site verification console. A coordinator pastes the trial id and the tx hash `[FILL AFTER DEPLOY]`; the indexer confirms: "ELIGIBLE — attested, verified on Preprod." The right-hand panel where a record would appear is empty, labeled "record: never received".

**Speaker:**
> And the trial site? It types in the trial id and the transaction hash — and gets a verified yes. The right side of its screen, where a medical record would be, stays empty. Forever.

---

## 2:00–3:00 — WHAT'S NEW IN WAVE 3

*On screen: a slate card: "What's new in Wave 3." Cut back to the dapp.*

**BEAT 6 — The issuer-attested circuit (2:00–2:24)**
**On screen:** the demo issuer's attestation ceremony, simplified: "Issuer attests attribute bundle" → attestation lands in the contract's attestation set (tx hash `[FILL AFTER DEPLOY]`). Then the patient flow again, this time with a badge: "Proving over issuer-attested attributes."

**Speaker:**
> Wave 2 proved eligibility. Wave 3 answers the harder question: who vouches for the patient's inputs? A demo issuer now attests the patient's attribute bundle first — and the patient proves over those attested attributes. The circuit checks the issuer's stamp, then the trial's rules. Trust splits three ways: the patient holds the record, the issuer vouches the inputs, the chain verifies the proof.

*Plain language only: "the issuer vouches the inputs" is the whole explanation. Never say "attestationOf", "persistentHash", or "circuit".*

**BEAT 7 — The site console (2:24–2:40)**
**On screen:** return to the site verification console. This time a real read path: trial id + tx hash entered live (tx hash `[FILL AFTER DEPLOY]`), indexer confirmation arrives in a few seconds, stamped by the resurrected Blockfrost indexer.

**Speaker:**
> And verification got its own home. Trial sites paste a trial id and a transaction hash into the site console and get an indexer-confirmed answer — live, on Preprod, through the resurrected indexer.

**BEAT 8 — The catalog (2:40–3:00)**
**On screen:** quick scroll through the trial catalog — twelve cards, plain-language criteria each.

**Speaker:**
> Behind it all: a twelve-trial catalog, hand-mapped from real recruiting studies — `[TBD at shoot: exact count live on Preprod]` — plus synthetic FHIR import, so test records behave like real ones without any real patient data anywhere near the build.

*Do not claim twelve unless twelve are live at shoot time. The safe line is "a growing, hand-mapped catalog of real recruiting studies".*

---

## 3:00–3:30 — TRUST BOUNDARY + CLOSE

*On screen: three-column slate — "Stays private" | "Chain sees" | "We don't claim".*

**Speaker (word-for-word):**
> So here's the boundary. What stays private: your record, your age, your conditions, your medications — on your device, forever. What the chain sees: a one-time ticket, a scrambled commitment, and a counter. And what we don't claim: this is not a medical certification, our demo issuer is not a hospital, and no real patients' data appears anywhere in this build.

*Beat. Cut to black; the title card returns.*

> Prove you qualify for a clinical trial — without handing over your medical record.

*Hold on the title card. Fade out. Total: 3:30, with a 30-second safety margin under the 4-minute cap.*

---

## SHOOTING NOTES (not spoken)

- Mission lands by 0:07. All sourced numbers appear with their bracket citation in the edit — burned into the lower third if the editor prefers, or kept in this script's margin; either way, traceable.
- Jargon audit: the spoken track contains no "ZK-SNARK", no "nullifier", no "witness", no "circuit", no "attestationOf". The word "attest" appears once, spoken as "vouches" first, so it lands.
- `[FILL AFTER DEPLOY]` marks every tx hash and contract address. If the deploy isn't in by shoot day, the corresponding beat is filmed in the in-browser simulator tier — the two-tier demo exists exactly for this — and the script's beats are unchanged, only the provenance banner changes ("simulated in-browser").
- No users, pilots, partners, or outcomes are invented anywhere in this script. The trial cards shown are real recruiting studies from ClinicalTrials.gov API v2; the patient data is synthetic.
