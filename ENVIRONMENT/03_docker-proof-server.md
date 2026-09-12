# 03 — Docker + proof server

Date: 2026-09-12

## Docker engine

```
docker version
Client 29.7.2 windows/amd64
Server 29.7.2 linux/amd64  Docker Desktop 4.89.0

docker context ls
desktop-linux *   npipe:////./pipe/dockerDesktopLinuxEngine

docker info
MemTotal ~5.8 GiB   NCPU 3   Driver overlayfs

docker run --rm hello-world
# success after daemon start
```

## Proof-server image (pinned, not latest)

**Do not use `latest`.** Docs: `latest` lagged (last republished May 2026) while 8.1.0 is matrix-current.

| Field | Value |
|---|---|
| Image | `midnightntwrk/proof-server:8.1.0` |
| Digest | `sha256:801bbc0340e9e96f16735f77b523f23c7459e3359842f7c79c2c53f4e994d531` |
| Arch | amd64 / linux |
| Size | 114 MB local; inspect Size 26730919 (compressed layers differ) |
| Port | 6300/tcp |
| Command used | `docker run -d --name midnight-proof-server -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v` |
| Binary in image | `/nix/store/...-ledger-8.1.0/bin/midnight-proof-server --port $PORT` |
| First boot | Downloads SRS + zswap keys from `https://srs.midnight.network/` and **verifies** them (explicitly untrusted host, verified data) |
| `/version` | `8.1.0` |
| `/health` | `{"status":"ok",...}` |
| Idle RAM | ~9–18 MiB after SRS fetch |

**CONFLICT:** Windows Compact setup shows `docker run ... -- midnight-proof-server -v` (extra `--`). Getting-started / proving guide omit the extra `--`. The extra `--` is docker's "end of docker flags" form. Both can work; we used the getting-started form without extra `--`.

**CONFLICT:** Some compose healthchecks `echo > /dev/tcp/127.0.0.1:6300`. ZK Loan says do not curl-healthcheck inside the image (no curl). Our standalone container had no in-compose healthcheck; HTTP `/health` from the host works.

## Local stack actually running

| Container | Image | Host port | Probe |
|---|---|---|---|
| midnight-proof-server | proof-server:8.1.0 | 127.0.0.1:6300 | version 8.1.0, health ok |
| midnight-node | midnight-node:1.0.0 | 127.0.0.1:9944 | `system_chain` = **undeployed1**, `/health` isSyncing false |
| midnight-indexer | indexer-standalone:4.3.3 | 127.0.0.1:8088 | GraphQL `{ block { height } }` = 2 |

RAM of all three ~192 MiB combined. Docker cap 5.8 GiB is the proving risk, not idle.

## Compatibility

Proof-server 8.1.0 matches Compact 0.31.1 / ledger 8 / midnight-js 4.1.1 matrix. Do not pull proof-server 9.x RC.
