# ENVIRONMENT_FINAL

Windows 11 + WSL2 Ubuntu 24.04.3 + Docker Desktop 4.89 is a **working** Midnight engineering host if:

1. Docker Desktop is actually running
2. Compact lives in Ubuntu, pinned **0.31.1**
3. Node in Ubuntu is **22** (not host 24)
4. Compile on `/home/...` not `/mnt/d`
5. Proof-server tag is **8.1.0**, not latest

Blockers cleared: Docker stopped, no Compact, no Node 22, no unzip, CRLF scripts, Windows PATH leak.

Remaining: full hello-world prove+deploy; Preview faucet+DUST; unzip via apt; Docker CPU/RAM cap for large proofs; 1AM browser proving untested.
