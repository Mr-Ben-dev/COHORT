#!/usr/bin/env node
// COHORT keep-alive pinger.
//
// Free-tier hosts (Render web services spin down after ~15 minutes of
// inactivity; Vercel hobby functions can cold-start too). A judge opening
// the app or API for the first time in a while would otherwise eat the
// cold-start. This script pings both live surfaces so they stay warm.
//
// URLs come from render.yaml (service `cohort`, healthCheckPath /health)
// and README.md (designer Vercel app). Override with env when staging:
//   COHORT_API_ORIGIN=https://cohort-y4zr.onrender.com
//   COHORT_APP_URL=https://cohort-web-orcin.vercel.app
//
// No secrets needed -- both probes are unauthenticated GETs.
//
// SCHEDULING (external, every 10 minutes -- Render's free plan has no
// native cron jobs, so run this from somewhere always-on):
//   - System cron on any server you control (see docs/keepalive.md).
//   - GitHub Actions `schedule` with a cron expression (see docs/keepalive.md).
//   - A free ping service such as cron-job.org pointed at the same URLs.
//
// Failures are logged, never fatal: exit code is always 0 so a scheduler
// never treats a transient blip as a job failure.

const API_ORIGIN = (process.env.COHORT_API_ORIGIN || "https://cohort-y4zr.onrender.com").replace(/\/+$/, "");
const APP_URL = (process.env.COHORT_APP_URL || "https://cohort-web-orcin.vercel.app").replace(/\/+$/, "");

const PROBES = [
  { name: "api-health", url: `${API_ORIGIN}/health` },
  { name: "api-root", url: `${API_ORIGIN}/` },
  { name: "app-root", url: `${APP_URL}/` },
];

const TIMEOUT_MS = 25_000;

function stamp() {
  return new Date().toISOString();
}

async function probe({ name, url }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "cohort-keepalive/1.0" },
    });
    const ms = Date.now() - started;
    // Any HTTP response means the host is awake; 2xx/3xx/4xx all count.
    // Only a network error or abort means "asleep / unreachable".
    console.log(`[${stamp()}] OK   ${name} ${url} -> HTTP ${res.status} (${ms}ms)`);
    return true;
  } catch (err) {
    const ms = Date.now() - started;
    const reason = err?.name === "AbortError" ? "timeout" : String(err?.message || err);
    console.log(`[${stamp()}] FAIL ${name} ${url} -> ${reason} (${ms}ms)`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const results = await Promise.all(PROBES.map(probe));
const ok = results.filter(Boolean).length;
console.log(`[${stamp()}] keepalive done: ${ok}/${PROBES.length} reachable`);
// Always exit 0: a scheduler must not page on a transient blip.
process.exit(0);
