# 06 — Local network

Date: 2026-09-12
Method: official `midnight-local-dev/standalone.yml` **node + indexer** plus separately started proof-server 8.1.0 (port 6300 already taken).

## Ports (measured, not tutorial-assumed)

| Service | URL | Result |
|---|---|---|
| Node RPC | http://127.0.0.1:9944 | `system_chain` = **undeployed1** |
| Node health | http://127.0.0.1:9944/health | `{peers:0, isSyncing:false, shouldHavePeers:false}` |
| Indexer GraphQL | http://127.0.0.1:8088/api/v4/graphql `{ block { height } }` | height **2** |
| Proof server | http://127.0.0.1:6300/version | 8.1.0 |
| Proof health | http://127.0.0.1:6300/health | status ok |

Network ID for SDK: still set `undeployed` per docs. RPC display name is `undeployed1`. **CONFLICT / UNKNOWN** whether SDK enum must match the string `undeployed1`.

## Images

```
midnightntwrk/midnight-node:1.0.0
midnightntwrk/indexer-standalone:4.3.3
midnightntwrk/proof-server:8.1.0
```

## Resources

Idle: node ~158 MiB, indexer ~16 MiB, proof-server ~18 MiB. Docker VM 5.8 GiB / 3 CPUs.

## Not run

- `npm start` funding menu / genesis wallet 50k tNIGHT
- DUST registration
- Lace undeployed connect
- hello-world `yarn test:local`
