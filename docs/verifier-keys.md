# Verifier-key SHA-256 record — full-ZK compile (SQUAD B5)

Source artifacts: `packages/contract/.compile-out/keys/*.verifier`, produced by the
full-ZK compile (compactc 0.31.1, NO `--skip-zk`, exit 0) run by the integrator.

| Circuit | Verifier SHA-256 (measured) | Deployment status |
|---|---|---|
| `proveEligible` | `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1` | Deployed Wave-1 contract `1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc` (Preprod) — byte-identical to pinned `VERIFIER_SHA256` in `scripts/judge-pins.mjs` |
| `attest` | `93f5b746871ad5eb5579e675e1913dc7b5aa830e0cea8ba602aa4e27f1c91303` | Undeployed — no chain writes in this run |
| `attestWithAttributes` | `84c89c88fa62c3a1cea7ffbbc67d4f0d0036bc844aff6f74e7d34413047320f4` | Undeployed — no chain writes in this run |
| `proveAttested` | `a457129525ef3e0458dde077872df02c98d4647d39f278b2d0883f7b11275e13` | Undeployed — no chain writes in this run |

- Compiler: `0.31.1` (from `packages/contract/.compile-out/compiler/contract-info.json`;
  language `0.23.0`, runtime `0.16.0`).
- Compile completed: 2026-10-19 02:15:03 UTC (05:15:03 EEST). Key files were
  written between 02:14:06 and 02:15:03 UTC on 2026-10-19.
- `proveEligible` verifier key measured `sha256sum` locally equals the Wave-1 pin
  `5af3b4b2ed345f711c5ff87367cfb0049732701c5a5336d51234b2a95fe32ab1` —
  byte-identical; the existing pin logic in `scripts/compile-contract.mjs` and
  `scripts/judge-verify.mjs` is untouched.
- The three new circuits (`attest`, `attestWithAttributes`, `proveAttested`) are
  pinned in `scripts/judge-pins.mjs` as `ATTEST_VERIFIER_SHA256`,
  `ATTEST_WITH_ATTRIBUTES_VERIFIER_SHA256`, and `PROVE_ATTESTED_VERIFIER_SHA256`,
  with a `verifyAllVerifierKeys()` helper — code only, no deploy.
