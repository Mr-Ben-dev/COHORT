# COHORT — 5-Minute Live Demo Script (for a video call)

**Have these tabs open before the call starts:**
1. https://cohort-web-orcin.vercel.app — the live site (patient flow)
2. https://cohort-web-orcin.vercel.app/sites — the site verification console
3. https://preprod.midnightexplorer.com/ — paste the contract address below when needed
4. https://cohort-y4zr.onrender.com/health — API heartbeat (fallback evidence)

**Reference values (copy-paste ready):**
- Contract: `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc`
- Gold-path tx: `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60`
- Trial used in the gold path: NCT07153614 (minAge 18, maxAge 80)
- Verifier SHA-256: `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1`

**Before the call:** open tab 1 and confirm it loads. If it is slow on first load, say so out loud (fallback line below) — the Render free tier cold-starts; it is honest to name it.

---

## 0:00–0:30 — The mission (say it, then stop talking)

> "Prove you qualify for a clinical trial without handing over your medical record. Today, to learn if you're eligible, you hand your full record to a screening coordinator you've never met. COHORT flips that: your facts stay on your device, a zero-knowledge proof runs in your browser, and the trial site verifies the proof on-chain — they learn you're eligible, and nothing else. This is live on Midnight Preprod right now."

## 0:30–2:00 — Patient flow (do it, don't describe it)

1. **(0:30)** On tab 1, browse the trial list. Say: "Twelve recruiting trials, rules pulled from ClinicalTrials.gov and hand-mapped to typed criteria. Each trial lists what the circuit *can't* check — we publish the gaps."
2. **(1:00)** Pick NCT07153614. Enter an age inside 18–80 and the condition/medication flags **in the browser form**. Say: "Everything I type stays on this device. Nothing is sent anywhere — the backend rejects private fields with an HTTP 400."
3. **(1:30)** Run the local match, then the prove step. If the wallet path is ready: connect and approve — the proof generates in-browser via WASM. If not, use the simulator tier and say so: "This is the simulator tier running the real compiled circuit — the wallet tier runs the same circuit against Preprod."
4. **(2:00)** Show the result: an indexer-confirmed qualification. Say: "What the chain received: a trial-scoped nullifier, a blinded commitment, and a counter. Not my age. Not my condition. Those never left this laptop."

**Fallback if the site is slow:** "First load can take ~30 seconds — the API tier sleeps when idle. While it wakes: the API heartbeat is [open tab 4] — `{"status":"ok"}` means the backend is alive, and everything I just described is reproducible from the repo with `npm run judge:verify`."

## 2:00–3:30 — Site verification console (the other side of the trust story)

1. **(2:00)** Switch to tab 2 (`/sites`). Say: "Now the trial site's view. No wallet, no login — a coordinator pastes a trial ID and a transaction hash."
2. **(2:30)** Paste trial `NCT07153614` and the gold-path tx `da8f79de04a120d7a0c8b433de992b21bee37a234b4af2c717aa16fb84fc1a60`. Show the console confirming it against the indexer. Say: "The site verifies the proof against the chain — not against my word, not against our servers. They learn one bit: eligible."
3. **(3:00)** Open tab 3, paste the contract address into the explorer. Show the contract's transactions. Say: "Every proof is a public, permanent, independently checkable transaction. Nothing about the patient is in here — that's the point you can audit."
4. **(3:30)** Close the explorer. Say: "Two sides, one chain: the patient proves, the site verifies, nobody holds the record."

**Fallback if the console can't reach the indexer live:** "The console reads the official Preprod indexer — if it's unreachable right now, the same verification is a single GraphQL query [show the curl from the README §18]. The trust doesn't depend on our UI being up."

## 3:30–4:30 — The attestation story + honest limits (say these before they ask)

> "One honest gap, and how we're closing it. Today, the patient asserts their own facts — the circuit checks the predicate, not who asserted the inputs. That's stated in our docs. The fix is issuer attestation: a demo issuer attests the patient's attribute bundle first, and the patient proves *over attested attributes*. The new circuits — `attest`, `attestWithAttributes`, `proveAttested` — are compiled, full zero-knowledge, verifier keys pinned in the repo. And three things this is not: not HIPAA compliance, not medical certification, not enrollment. Sites still run their own screening — we just make the first step private."

## 4:30–5:00 — The ask (verbatim close)

> "I'm not asking for a commitment, a logo, or an endorsement — just 20 minutes with whoever owns your trial-matching funnel, to run this same demo against three to five trials your community actually cares about. You bring the trial list; we hand-map the criteria; your community tries the prover. If it doesn't matter to them, I've learned something in 20 minutes. What I need from you is one name and one intro."

**Then stop. Let them respond.**
