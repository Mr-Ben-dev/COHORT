// Regression guard for the Preprod -> Blockfrost migration.
//
// Fails if any shipped file still references the dead Midnight Preprod
// endpoints (indexer.preprod.midnight.network / rpc.preprod.midnight.network,
// shut down 2026-10-09, HTTP 410).
//
// Intentionally excluded:
// - node_modules, .git, package-lock.json — third-party / generated.
// - DECISIONS/, ENVIRONMENT/, MIDNIGHT/, RESEARCH/ — frozen historical
//   research records; history is not rewritten.
// - TESTS/ itself — TESTS/gold-path.test.mjs asserts the retired hostname
//   still passes isMidnightPublicIndexer() (the allowlist is a truth check,
//   not a blocklist) and TESTS/playwright-web-wallets.test.mjs uses it as a
//   mocked wallet config. Both are deliberate, and TESTS/ content must not
//   be edited for this migration.
// - local .env files (untracked); .env.example IS scanned.
//
// The dead hostnames below are regex-escaped so this file never trips its
// own scan.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEAD = ['indexer\\.preprod\\.midnight\\.network', 'rpc\\.preprod\\.midnight\\.network'].map(
  (src) => new RegExp(src),
);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'DECISIONS',
  'ENVIRONMENT',
  'MIDNIGHT',
  'RESEARCH',
  'TESTS',
]);
const SKIP_FILES = new Set(['package-lock.json']);

// Deliberate survivors: isMidnightPublicIndexer() in
// packages/dapp/src/providers.mjs keeps the retired hostnames in its
// allowlist (a truth check, not a blocklist — see also
// TESTS/gold-path.test.mjs). The allowlist ships in source and inside the
// built bundles (apps/web/cohort-dapp.js, web/public/dapp/cohort-dapp.js),
// so exactly those comparison lines are exempt — nothing else.
const ALLOWLIST_LINE = /===\s*['"]indexer\.preprod\.midnight\.network['"]/;

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      yield* walk(path.join(dir, ent.name));
      continue;
    }
    if (!ent.isFile()) continue;
    if (SKIP_FILES.has(ent.name)) continue;
    if (ent.name.startsWith('.env') && ent.name !== '.env.example') continue; // local untracked env
    yield path.join(dir, ent.name);
  }
}

test('no dead indexer/RPC hosts remain in shipped code/config/docs', () => {
  const hits = [];
  let scanned = 0;
  for (const file of walk(root)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\0')) continue; // binary
    scanned += 1;
    const lines = text.split('\n');
    for (const re of DEAD) {
      const bad = lines.filter((line) => re.test(line) && !ALLOWLIST_LINE.test(line));
      if (bad.length) {
        hits.push(
          `${path.relative(root, file)} matches ${re.source} (${bad.length} line(s), e.g. ${bad[0].trim().slice(0, 120)})`,
        );
      }
    }
  }
  assert.ok(scanned > 50, `suspiciously few files scanned (${scanned})`);
  assert.equal(hits.length, 0, `dead indexer/RPC references remain:\n${hits.join('\n')}`);
});

test('Blockfrost Preprod endpoints are referenced where the dead hosts were', () => {
  const shipped = [
    '.env.example',
    'render.yaml',
    'scripts/judge-pins.mjs',
    'apps/api/src/server.mjs',
    'packages/dapp/src/blockfrost.mjs',
    'packages/dapp/src/providers.mjs',
    'web/src/lib/cohort-origin.ts',
    'web/next.config.ts',
    'README.md',
  ];
  for (const rel of shipped) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(
      text.includes('midnight-preprod.blockfrost.io'),
      `${rel} does not reference the Blockfrost Preprod endpoint`,
    );
  }
});
