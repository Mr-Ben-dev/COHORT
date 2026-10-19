# COHORT wallet demo checklist (judge laptop)

Goal: zero-surprise proving flow on a laptop we do not control. Wallet
matrix: **GeroWallet primary, 1AM fallback, Lace not for proving.**

## Night before (do not skip)

- [ ] **Pre-fund + pre-register tDUST.** GeroWallet does in-wallet DUST
      generation/registration; there is NO verified fee sponsor, so the demo
      backstop plan assumes no sponsor. Generate tDUST on the demo wallet the
      night before, not on stage.
- [ ] **Relay Club / self-funded DUST backstop.** Keep a second funded wallet
      (1AM) ready; if the primary wallet's DUST runs dry, switch providers
      rather than debugging on stage.
- [ ] Install both extensions on the demo profile: GeroWallet 2.7.x and 1AM.
      Verify `window.midnight` entries: enumerate `Object.values(window.midnight)`
      and confirm a `gero`-matching `name`/`rdns` entry and a `1am` entry.
- [ ] **Chrome passkey PRF check.** GeroWallet offers passkey unlock; open the
      wallet and confirm the passkey path works on THIS machine (WebAuthn PRF
      support varies). If not, fall back to password unlock — also supported.
- [ ] **Verify 1AM fee-sponsorship currency.** If 1AM advertises any fee
      sponsorship, check that it is still live on Preprod tonight — never
      assume yesterday's sponsorship state.
- [ ] Open the dApp session view in GeroWallet: confirm the panel shows proof
      progress, DUST battery, and proof server at a glance.
- [ ] Set GeroWallet's proof location deliberately: **local proof server** (or
      1AM) for any trial-data run; Gero Cloud only for non-sensitive runs —
      see `docs/wallet-trust.md`. Do not leave the default cloud path active
      during a privacy-sensitive demo without stating it on stage.
- [ ] Note the proving switch in Gero's dashboard/side panel: "Gero Cloud, a
      local proof server on your own machine, or Arkhia zkPaaS".

## Day of

- [ ] **30–60s first-proof budget.** The first proof is the slow one (WASM
      warm-up / cloud round-trip). Have a scripted fallback line and a cached
      narrative ready; never stare at a spinner on stage.
- [ ] Confirm network: Preprod in the wallet, Preprod in the dApp. The app
      will not silently change networks.
- [ ] One full dry-run end-to-end on the same profile, same extensions, same
      network, 15 minutes before go-time.
- [ ] Lace: do not install for proving. If Lace is present it connects but
      cannot prove in-browser — keep it off the demo machine to avoid
      confusion.

## If something breaks on stage

1. Switch Gero ↔ 1AM in the wallet list (matrix order: gero → 1am).
2. If proving fails on both, state it honestly: "proving is unavailable on
   this machine right now" — never a fake success.
3. Post-mortem inputs: extension versions, `window.midnight` enumeration,
   wallet `apiVersion`, proof-location setting.
