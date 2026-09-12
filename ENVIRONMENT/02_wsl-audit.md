# 02 — WSL audit

Date: 2026-09-12

Official source: https://docs.midnight.network/guides/windows-compact-setup and getting-started installation (Kapa).

## Official answers

| Question | Official | This machine |
|---|---|---|
| Windows native Compact? | No | Confirmed: no Windows compactc |
| WSL2 required? | Yes | Ubuntu VERSION 2 |
| Ubuntu version? | Default Ubuntu from `wsl --install -d ubuntu` | **24.04.3 LTS** |
| Shell | Ubuntu bash | bash; installer also wrote `~/.local/bin/env` |
| Repo location | Native Linux FS, **not** `/mnt/c` | Working tree: `/home/devmo/cohort-work`. Cursor workspace remains `D:\route\midnight` (`/mnt/d/...`). Compile copies to Linux FS. |
| Docker + WSL | Enable Ubuntu integration | After Docker start, `docker-desktop` Running; Windows docker CLI talks to linux engine |
| Filesystem warning | `/mnt/c` npm line endings, performance | Recorded. CRLF from Windows Write tool broke `set -o pipefail`. |
| Env vars | `PATH` must include Compact. Optional `COMPACT_DIRECTORY` default `~/.compact` | Devtools: `~/.local/bin/compact`. Compiler: `~/.compact` |
| Known WSL bugs | npm cache mixing Windows/WSL; Brave Shields vs proof server | CRLF scripts; leaked Windows PATH with `(x86)` breaking `bash -lc`; missing `unzip` |

## Commands run

```
wsl -l -v
# Ubuntu Running 2
# docker-desktop Running 2

uname -a
# Linux DESKTOP-DS50T9U 6.18.33.2-microsoft-standard-WSL2 ... x86_64

cat /etc/os-release
# Ubuntu 24.04.3 LTS (Noble Numbat)

node --version   # after nvm install 22: v22.23.2
npm --version    # 10.9.8
git --version    # Ubuntu 2.43.0
```

Docker in Ubuntu was not used; Windows `docker` client + desktop-linux engine was used for containers. That is sufficient: proof-server, node, indexer all bound to `127.0.0.1`.

## CONFLICTs

- Docs: `export PATH="$HOME/.compact/bin:$PATH"`. Installer 0.5.2: `$HOME/.local/bin`.
- Docs: `compact update` vs required `compact update 0.31.1`.
- `compact update 0.31.1` failed until `artifact.zip` was extracted with Python (`unzip` missing). Then: `compact: x86_64-unknown-linux-musl -- 0.31.1 -- default.` and `compact compile --version` → `0.31.1`.
