# 04 — Dependency security

Date: 2026-09-12

## Policy

- Official matrix pins only. No Discord “latest”.
- Wallet SDK **exact** 1.2.0 (npm latest 1.1.0).
- Docker images by tag + digest recorded for proof-server 8.1.0.
- Compact compiler from `compact update 0.31.1` GitHub zip, extracted locally.

## Installed / pulled

| Artifact | How | Provenance note |
|---|---|---|
| compact 0.5.2 | compact-installer.sh from `github.com/midnightntwrk/compact/releases/latest` | cargo-dist receipt in `~/.config/compact/compact-receipt.json` owner midnightntwrk |
| compactc 0.31.1 | zip inside `~/.compact/versions/0.31.1/.../artifact.zip` | official toolchain zip members: compactc, compactc.bin, zkir, zkir-v3 |
| node 22.23.2 | nvm from nodejs.org | checksum matched (nvm log) |
| compact-runtime 0.16.0 | npm `--save-exact` | 0 vulnerabilities reported by npm audit on that tiny tree |
| proof-server:8.1.0 | Docker Hub midnightntwrk | digest sha256:801bbc0340e9… ; first-run SRS from srs.midnight.network **verified** |
| midnight-node:1.0.0 | Docker Hub | digest sha256:ede01da3… |
| indexer-standalone:4.3.3 | Docker Hub | digest sha256:03afd079… |
| hello-world npm | yarn 1.22.22 (in progress) | official lockfile present |

## Post-install scripts

Compact installer is a shell script from Midnight GitHub (same class of risk as any curl|sh). Ran because it is the **documented** path. Did not run random Discord commands.

## Known incidents

Parent research mentions historical Midnight Discord supply-chain noise. This lab used docs.midnight.network + github.com/midnightntwrk + Docker Hub org `midnightntwrk` only.

## Not done

- `npm audit` on full hello-world tree (install may still be running)
- Cosign/attestation on Docker images (UNKNOWN whether Midnight signs)
- SLSA provenance for compactc zip
