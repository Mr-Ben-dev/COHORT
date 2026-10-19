# Verifier-key SHA-256 record — full-ZK compile (SQUAD B5)

Source artifacts: `packages/contract/.compile-out/keys/*.verifier`, produced by the
full-ZK compile (compactc 0.31.1, NO `--skip-zk`, exit 0) run by the integrator.

| Circuit | Verifier SHA-256 (measured) | Deployment status |
|---|---|---|
| `proveEligible` | `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1` | Deployed Wave-1 contract `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc` (Preprod) — byte-identical to pinned `VERIFIER_SHA256` in `scripts/judge-pins.mjs` |
| `attest` | `9819eb36437ed0d4f24911eff41e502275ebbb6ed8466653946f63fa97c58ab1` | Undeployed — no chain writes in this run |
| `attestWithAttributes` | `cbd12106fccbac72c04d2b60858871149209b2d164d2db02c4701d405dba6566` | Undeployed — no chain writes in this run |
| `initIssuer` | `80df3538420f83b9e9dbe20e3ac6d1e52cde722633cd8449bcb1f00e9e400858` | Undeployed — no chain writes in this run |
| `proveAttested` | `a457129525ef3e0458dde077872df02c98d4647d39f278b2d0883f7b11275e13` | Undeployed — no chain writes in this run |

- Compiler: `0.31.1` (from `packages/contract/.compile-out/compiler/contract-info.json`;
  language `0.23.0`, runtime `0.16.0`).
- Compile completed: 2026-10-19 02:15:03 UTC (05:15:03 EEST). Key files were
  written between 02:14:06 and 02:15:03 UTC on 2026-10-19.
- DESIGN CHANGE (2026-10-19): the issuer identity moved from a baked-in
  `circuit issuerId()` string literal to the `issuerId` LEDGER installed once
  via `initIssuer(id)`. Reason (verified empirically): compactc 0.31.1
  interprets `\xNN` string escapes as Unicode codepoints and UTF-8-encodes
  them, so any byte >= 0x80 becomes two bytes — an arbitrary 32-byte secret
  cannot live in a literal. `proveAttested` is unaffected (it never referenced
  the issuer ID); `attest`/`attestWithAttributes` keys changed accordingly.
- `proveEligible` verifier key measured `sha256sum` locally equals the Wave-1 pin
  `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1` —
  byte-identical; the existing pin logic in `scripts/compile-contract.mjs` and
  `scripts/judge-verify.mjs` is untouched.
- The three new circuits (`attest`, `attestWithAttributes`, `proveAttested`) are
  pinned in `scripts/judge-pins.mjs` as `ATTEST_VERIFIER_SHA256`,
  `ATTEST_WITH_ATTRIBUTES_VERIFIER_SHA256`, and `PROVE_ATTESTED_VERIFIER_SHA256`,
  with a `verifyAllVerifierKeys()` helper — code only, no deploy.
