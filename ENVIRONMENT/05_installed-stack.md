# 05 — Installed stack (after minimum install)

Date: 2026-09-12

| Component | Where | Version | Verified by |
|---|---|---|---|
| WSL2 Ubuntu | Ubuntu distro | 24.04.3 LTS | /etc/os-release |
| Node | Ubuntu nvm | v22.23.2 | node --version |
| npm | Ubuntu | 10.9.8 | npm --version |
| Compact devtools | ~/.local/bin/compact | 0.5.2 | compact --version |
| Compact compile | ~/.compact default | **0.31.1** | compact compile --version |
| compact-runtime | sandbox npm | 0.16.0 exact | npm install --save-exact |
| Docker Desktop | Windows | 4.89.0 / engine 29.7.2 | docker version |
| proof-server | container | 8.1.0 | curl /version |
| midnight-node | container | 1.0.0 | image tag + system_chain undeployed1 |
| indexer-standalone | container | 4.3.3 | image tag + graphql height |
| Git Ubuntu | /usr/bin/git | 2.43.0 | earlier audit |
| unzip | missing | — | Python zipfile used instead |

Not installed: Compact 0.34, midnight-js 5, global yarn (corepack yarn 1.22.22 used for hello-world), Java (not required).
