# COHORT keep-alive

**Why:** the Render API runs on the free plan and spins down after ~15 minutes
with no traffic. A judge opening the demo link for the first time in a while
would eat a 30–60s cold start on `/api/*` before anything renders. Vercel's
frontend can cold-start too. `scripts/keepalive.mjs` pings both surfaces so a
judge never sees the cold start.

**What it pings** (all unauthenticated; URLs documented in `render.yaml` and `README.md`):

| Target | URL | Purpose |
|---|---|---|
| API health | `https://cohort-y4zr.onrender.com/health` | Render `healthCheckPath`; 200 = service awake |
| API root | `https://cohort-y4zr.onrender.com/` | keeps the Node server warm |
| App root | `https://cohort-web-orcin.vercel.app/` | keeps the Vercel frontend warm |

Overrides: `COHORT_API_ORIGIN`, `COHORT_APP_URL` env vars. No secrets needed.

**Schedule: every 10 minutes.** Failures are logged and tolerated (script
always exits 0), so a transient blip never marks the job failed.

## Option A — system cron (recommended)

On any machine that is always on:

```cron
*/10 * * * * /usr/bin/node /path/to/COHORT/scripts/keepalive.mjs >> /var/log/cohort-keepalive.log 2>&1
```

## Option B — GitHub Actions

Create `.github/workflows/keepalive.yml` in the COHORT repo:

```yaml
name: keepalive
on:
  schedule:
    - cron: "*/10 * * * *"
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node scripts/keepalive.mjs
```

## Option C — free ping service

Point a cron-job.org (or equivalent) monitor at the two health/root URLs on
a 10-minute interval. Same effect, zero infrastructure.

## Notes

- Render's free plan has no native cron jobs — that is why this is external.
- Do not ping Blockfrost or the Midnight explorer here; this is host
  warm-up only, not indexer polling.
- Never add secrets to the keep-alive config: both probes are public GETs.
