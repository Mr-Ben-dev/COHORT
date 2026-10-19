# Wallet trust boundary — GeroWallet vs 1AM (COHORT)

Date: 2026-10-19. Audience: judges, auditors, and anyone reviewing where
clinical-trial witness data flows. This document states what is *verified*
and what is *not yet verified* — the two are kept strictly separate.

## The trust boundary, in one paragraph

COHORT's default wallet path is GeroWallet. GeroWallet's **default proof
location is Gero Cloud**: the witness data used to generate a zero-knowledge
proof is sent to infrastructure operated by Gero (verified — see "Verified"
below). For a clinical-trial product this must be disclosed to the data
controller and, where required, to participants. Gero offers a local
proof-server switch (verified to exist). 1AM proves in-browser with WASM, so
witnesses stay on the user's device.

## Verified (web-verified 2026-10-19)

| Claim | Source |
|---|---|
| Wallets inject InitialAPI under `window.midnight`, keyed by a freshly generated UUID, not a fixed name. Discovery must enumerate `Object.values(window.midnight)` and match `name`/`rdns`. | https://docs.midnight.network/guides/react-wallet-connect |
| Connect flow: `wallet.connect(networkId)` returns ConnectedAPI; methods include `getConfiguration`, `getShieldedAddresses`, `getDustBalance`, `getConnectionStatus`, `hintUsage`. | https://docs.midnight.network/api-reference/dapp-connector |
| DApp Connector API v4 deprecates `proverServerUri`; replacement is `getProvingProvider()`. | https://docs.midnight.network/relnotes/dapp-connector-api/dapp-connector-api-4-0-0 |
| GeroWallet 2.7.2 is the current release. | https://gerowallet.io/download/ |
| GeroWallet supports passkey unlock (no seed phrase) for Midnight wallets. | https://gerowallet.io/midnight-wallet/ ("Creating a Midnight mainnet wallet, with a passkey as the unlock option.") |
| GeroWallet's dApp session view "proves, funds and submits the transaction". | https://gerowallet.io/midnight-wallet/ ("What a Midnight dApp session looks like in the wallet") |
| **Proof-location choice exists in GeroWallet: "Gero Cloud, a local proof server on your own machine, or Arkhia zkPaaS with your own key, switchable from the dashboard or side panel."** The default is Gero Cloud, and witness data therefore crosses to Gero infrastructure on the default path. | https://gerowallet.io/midnight-wallet/ |
| Cross-device proving is end-to-end encrypted: "Gero infrastructure only ever sees ciphertext." (Explicit ciphertext-only mode; the default Gero Cloud path is *not* described this way.) | https://gerowallet.io/midnight-wallet/ |
| Lace implements no in-browser `getProvingProvider` (Docker proof-server path only); that is why COHORT disqualifies it for judge laptops. | Repo decision record: `MIDNIGHT/wallet-matrix.md` |

## NOT verified (do not assert as fact)

- GeroWallet's exact `rdns` / injected `name` string. The vendor documents
  no fixed key; `packages/dapp/src/wallets.mjs` matches the case-insensitive
  substring `gero` across inject key + rdns + name, which is robust to the
  UUID-keying model. Verify the exact `name`/`rdns` on a judge laptop with the
  extension installed before final UI copy.
- Whether GeroWallet's ConnectedAPI exposes `getProvingProvider()` for dApps.
  Detection treats pre-connect proving capability as a best-effort heuristic;
  the honest signal is post-connect (`typeof api.getProvingProvider ===
  'function'`). If Gero does not expose it, the Gero path fails loud with
  `WALLET_NO_PROVING` and the 1AM fallback is used.
- Any claim of fee sponsorship at zero DUST. GeroWallet documents in-wallet
  DUST generation/registration only. **The demo backstop plan assumes no
  sponsor**: pre-fund and pre-register tDUST the night before (see
  `docs/wallet-demo-checklist.md`).
- Chrome passkey-PRF support on the specific judge laptop — verify in
  pre-demo (see checklist); password unlock is the documented fallback on
  https://gerowallet.io/midnight-wallet/.

## Recommendation

- **Default judge flow:** GeroWallet, with the trust note surfaced in the UI.
- **Privacy-sensitive path (clinical-trial data):** 1AM — in-extension WASM
  proving, witnesses never leave the device — or GeroWallet with its local
  proof-server switch enabled. Do not run trial data through Gero Cloud
  without the data controller's explicit approval.
- **Never:** Lace for proving (no in-browser proving; faucet + tDUST wait is
  disqualifying for a judge laptop).

## Where this is enforced in code

- `packages/dapp/src/wallets.mjs` — `detectWallets()` (3-row matrix),
  `preferredWalletId()` (gero → 1am → null), `connectWallet(id)`,
  `getProvingProvider(id)`; `GERO_CLOUD_PROVING_NOTE` surfaced on every
  Gero session; `LACE_NO_PROVING_MESSAGE` refuses Lace proving paths.
- UI: the proving-screen wallet picker and wallet modal name GeroWallet as
  the recommended option with the cloud-proving tradeoff stated.
