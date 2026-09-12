# 01 — Initial machine audit (read-only first pass, then Docker started)

Date: 2026-09-12
Host: Windows 11 Pro for Workstations, build 26200, 64-bit

## Hardware

| Item | Result |
|---|---|
| CPU | Intel Core i7-14700HX, 20c/28t |
| RAM | ~15.71 GB total. First audit free RAM was ~1.2 GB (pressure). |
| Disk | C ~215 GB free; D ~127 GB free |
| GPU | RTX 4060 laptop + Intel UHD. Not required for Compact. |
| Arch | x86_64 / amd64 |

## Windows tooling (first audit)

| Tool | Version / note |
|---|---|
| Git | 2.55.0 |
| Node (Windows) | v24.12.0 — **do not use for Midnight**. Matrix/tutorials want Node ≥22; ZK Loan: Node 20 crashes. Host 24 is extra-unofficial. |
| npm | 11.6.2 |
| pnpm | 10.34.5 |
| Python | 3.14 |
| jq | 1.8.2 |
| yarn / make / gcc | missing on Windows host |
| Compact | missing on Windows (expected) |

## Docker (first audit vs after start)

**FACT first audit:** Docker client 29.7.2 present. Daemon **not running** (`npipe dockerDesktopLinuxEngine` missing). `docker run hello-world` failed. `docker-desktop` WSL distro Stopped.

**FACT after Start-Process `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`:**

```
Client: 29.7.2  windows/amd64  context desktop-linux
Server: Docker Desktop 4.89.0 (238018)
Engine: 29.7.2  linux/amd64
MemTotal observed: 6214758400 (~5.8 GiB)
NCPU: 3
hello-world: ran successfully
```

## WSL (first audit)

```
wsl --list --verbose
Ubuntu        Running  2
docker-desktop Stopped 2   (later Running after Docker start)
```

Inside Ubuntu: kernel `6.18.33.2-microsoft-standard-WSL2`, Ubuntu 24.04.3 LTS, user `devmo`. First audit: Node missing on PATH (nvm had only v24.12.0 until 22.23.2 installed). Compact missing. `docker` CLI missing in Ubuntu until Docker WSL integration came up.

## Destructive actions taken after recording

1. Started Docker Desktop (was installed, not running).
2. `nvm install 22` in Ubuntu (v22.23.2). Did **not** uninstall v24.
3. Compact installer 0.5.2 + extracted compiler 0.31.1 zip with Python because `unzip` was missing (`apt-get` hung on sudo).
4. Pulled `proof-server:8.1.0`, `hello-world`, `midnight-node:1.0.0`, `indexer-standalone:4.3.3`.
5. Started three containers.

No git config changes. No force-push. No Windows feature disable.
