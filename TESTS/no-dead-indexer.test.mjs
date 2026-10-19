// Regression guard for the Preprod -> Blockfrost migration.
//
// Fails if any live file still references the dead Midnight Preprod
// endpoints (indexer.preprod.midnight.network / rpc.preprod.midnight.network,
// HTTP 410). Historical research docs (DECISIONS/, ENVIRONMENT/, MIDNIGHT/,
// RESEARCH/) are frozen Wave-1 records and are intentionally excluded;
// this test file itself is excluded because it names the dead patterns.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.relative(root, fileURLToPath(import.meta.url));

const DEAD_HOSTS = ['indexer.preprod.midnight.network', 'rpc.preprod.midnight.network'];

// Migration-critical files that MUST be clean: a dead URL here means the
// migration missed a live surface. web/src/lib/cohort-origin.ts is the web
// origin pin; render.yaml / .env.example drive deployments.
function criticalFiles() {
  const files = [
    '.env.example',
    'render.yaml',
    'scripts/judge-pins.mjs',
    'apps/api/src/server.mjs',
    'web/src/lib/cohort-origin.ts',
  ];
  for (const f of fs.readdirSync(path.join(root, 'packages/dapp/src'))) {
    if (f.endsWith('.mjs')) files.push(`packages/dapp/src/${f}`);
  }
  return files;
}

function findDeadHosts(src) {
  return DEAD_HOSTS.filter((host) => src.includes(host));
}

test('no dead Preprod URLs in migration-critical files', () => {
  const violations = [];
  for (const rel of criticalFiles()) {
    const p = path.join(root, rel);
    assert.ok(fs.existsSync(p), `migration-critical file is missing: ${rel}`);
    for (const host of findDeadHosts(fs.readFileSync(p, 'utf8'))) {
      violations.push(`${rel} still references dead host "${host}"`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `dead Preprod endpoint found in migration-critical file(s):\n  ${violations.join('\n  ')}`,
  );
});

const SKIP_DIR_NAMES = new Set(['node_modules', '.git']);
const SKIP_TOP_DIRS = new Set(['DECISIONS', 'ENVIRONMENT', 'MIDNIGHT', 'RESEARCH']);
const SKIP_BASENAMES = new Set(['package-lock.json']);
const TEXT_EXT =
  /\.(md|mjs|cjs|js|ts|tsx|jsx|json|yml|yaml|html|css|example|gitignore|compact|txt|sh)$/i;

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    const rel = path.relative(root, p);
    if (ent.isDirectory()) {
      const top = rel.split(path.sep)[0];
      if (SKIP_TOP_DIRS.has(top)) continue; // frozen historical research records
      yield* walk(p);
    } else {
      if (rel === SELF) continue; // this test file names the dead patterns
      if (SKIP_BASENAMES.has(ent.name)) continue;
      if (!TEXT_EXT.test(ent.name)) continue;
      yield rel;
    }
  }
}

test('no dead Preprod URLs anywhere in the live repo tree', () => {
  const violations = [];
  let scanned = 0;
  for (const rel of walk(root)) {
    scanned += 1;
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const host of findDeadHosts(src)) {
      violations.push(`${rel}: dead host "${host}"`);
    }
  }
  assert.ok(scanned > 0, 'scan visited zero files; the walker is broken');
  assert.deepEqual(
    violations,
    [],
    `dead Preprod endpoint found in ${violations.length} file(s) (scanned ${scanned}):\n  ${violations.join('\n  ')}`,
  );
});
