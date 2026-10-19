#!/usr/bin/env node
/**
 * Swap the COHORT contract address across all wired files after a new deploy.
 * Usage: node scripts/swap-contract-address.mjs <new-address> [--commit]
 *
 * The deployer prints the new address on success. Run this, then redeploy
 * Render + Vercel so the frontend/backend pick up the new contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD = '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc';
const FILES = [
  'TESTS/contract.test.mjs',
  'TESTS/cohort-verify.test.mjs',
  'TESTS/playwright-web-goldpath-assets.test.mjs',
  'apps/api/src/blockfrost-live.mjs',
  'apps/web/cohort-dapp.js',
  'packages/dapp/src/claims.mjs',
  'scripts/judge-pins.mjs',
  'web/next.config.ts',
  'web/public/dapp/cohort-dapp.js',
  'web/src/lib/cohort-origin.ts',
];

const next = process.argv[2];
if (!next || !/^[0-9a-f]{64}$/.test(next)) {
  console.error('Usage: node scripts/swap-contract-address.mjs <64-hex-address> [--commit]');
  process.exit(1);
}
if (next === OLD) {
  console.error('New address is identical to the old one; nothing to do.');
  process.exit(1);
}

let changed = 0;
for (const f of FILES) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { console.log(`SKIP (missing): ${f}`); continue; }
  const src = fs.readFileSync(p, 'utf8');
  if (!src.includes(OLD)) { console.log(`SKIP (no match): ${f}`); continue; }
  fs.writeFileSync(p, src.split(OLD).join(next));
  changed++;
  console.log(`UPDATED: ${f}`);
}
console.log(`\nSwapped ${changed} files: ${OLD.slice(0,12)}... -> ${next.slice(0,12)}...`);

if (process.argv.includes('--commit')) {
  const r = spawnSync('git', ['-c', 'user.name=mr ben dev', '-c', 'user.email=mr-ben-dev@users.noreply.github.com',
    'commit', '-am', `contract: swap to new Preprod deployment ${next.slice(0,12)}...`],
    { cwd: root, encoding: 'utf8' });
  console.log(r.stdout || r.stderr);
}
console.log('\nNext: redeploy Render API + Vercel so the new address goes live.');
