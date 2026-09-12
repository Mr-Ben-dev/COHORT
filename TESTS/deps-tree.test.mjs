import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PUBLIC_NETWORK_PINS } from '../packages/dapp/src/pins.mjs';
import { CohortDapp, CohortError, ErrorCode } from '../packages/dapp/src/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));

function lockPackages() {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  return lock.packages || {};
}

function installedVersions(name) {
  const versions = new Set();
  const pkgs = lockPackages();
  for (const [loc, meta] of Object.entries(pkgs)) {
    if (!meta || typeof meta !== 'object') continue;
    const pkgName = loc === '' ? null : loc.replace(/^node_modules\//, '').replace(/\/node_modules\//g, '/');
    const last = loc.split('node_modules/').pop();
    if (last === name || meta.name === name) {
      if (meta.version) versions.add(meta.version);
    }
  }
  return versions;
}

test('CohortDapp Phase 1 surface throws NOT_IMPLEMENTED', () => {
  assert.throws(() => CohortDapp.proveEligibility(), (err) => {
    assert.equal(err instanceof CohortError, true);
    assert.equal(err.code, ErrorCode.NOT_IMPLEMENTED);
    return true;
  });
});

test('onchain-runtime-v3 is a single 3.0.0 tree', () => {
  const versions = installedVersions('@midnight-ntwrk/onchain-runtime-v3');
  assert.deepEqual([...versions], [PUBLIC_NETWORK_PINS.onchainRuntimeV3], [...versions]);
  const resolved = require.resolve('@midnight-ntwrk/onchain-runtime-v3');
  const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(resolved), 'package.json'), 'utf8'));
  assert.equal(pkg.version, PUBLIC_NETWORK_PINS.onchainRuntimeV3);
});

test('compact-runtime is 0.16.0 and shares onchain-runtime-v3 3.0.0', () => {
  const compactPath = require.resolve('@midnight-ntwrk/compact-runtime');
  const compactPkg = JSON.parse(
    fs.readFileSync(path.join(compactPath, '..', '..', 'package.json'), 'utf8'),
  );
  assert.equal(compactPkg.version, PUBLIC_NETWORK_PINS.compactRuntime);
  const onchainFromCompact = require.resolve('@midnight-ntwrk/onchain-runtime-v3', {
    paths: [path.dirname(compactPath)],
  });
  const onchainFromRoot = require.resolve('@midnight-ntwrk/onchain-runtime-v3');
  assert.equal(onchainFromCompact, onchainFromRoot);
});

test('midnight-js packages are exactly 4.1.1', () => {
  const names = [
    '@midnight-ntwrk/midnight-js-contracts',
    '@midnight-ntwrk/midnight-js-types',
    '@midnight-ntwrk/midnight-js-network-id',
    '@midnight-ntwrk/midnight-js-utils',
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
    '@midnight-ntwrk/midnight-js-level-private-state-provider',
    '@midnight-ntwrk/midnight-js-http-client-proof-provider',
    '@midnight-ntwrk/midnight-js-fetch-zk-config-provider',
    '@midnight-ntwrk/midnight-js-node-zk-config-provider',
    '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider',
    '@midnight-ntwrk/midnight-js-protocol',
  ];
  for (const name of names) {
    const versions = installedVersions(name);
    assert.ok(versions.has(PUBLIC_NETWORK_PINS.midnightJs), `${name} versions=${[...versions]}`);
    assert.equal(versions.size, 1, `${name} duplicated: ${[...versions]}`);
  }
});

test('dapp-connector-api is exactly 4.0.1', () => {
  const versions = installedVersions('@midnight-ntwrk/dapp-connector-api');
  assert.deepEqual([...versions], [PUBLIC_NETWORK_PINS.dappConnectorApi], [...versions]);
});

test('wallet-sdk is exactly 1.2.0 when present', () => {
  const versions = installedVersions('@midnight-ntwrk/wallet-sdk');
  assert.deepEqual([...versions], [PUBLIC_NETWORK_PINS.walletSdk], [...versions]);
});

test('generated contract and midnight-js-contracts resolve the same onchain-runtime-v3', async () => {
  const generatedDir = path.join(root, 'packages/contract/managed/cohort/contract');
  const fromGenerated = require.resolve('@midnight-ntwrk/onchain-runtime-v3', {
    paths: [generatedDir],
  });
  const fromJs = require.resolve('@midnight-ntwrk/onchain-runtime-v3', {
    paths: [path.join(root, 'node_modules/@midnight-ntwrk/midnight-js-contracts')],
  });
  assert.equal(fromGenerated, fromJs);
  const mod = await import(pathToFileURL(path.join(generatedDir, 'index.js')).href);
  assert.equal(typeof mod.Contract, 'function');
});

test('no midnight-js 5.x and no ledger-9 prove wrapper in dapp source', () => {
  const dappDir = path.join(root, 'packages/dapp');
  const walk = (dir, acc = []) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, acc);
      else if (p.endsWith('.mjs')) acc.push(p);
    }
    return acc;
  };
  for (const file of walk(dappDir)) {
    const src = fs.readFileSync(file, 'utf8');
    assert.equal(/\bunwrapV9\s*\(/.test(src), false, file);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const [name, ver] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (name.startsWith('@midnight-ntwrk/midnight-js')) {
      assert.equal(ver, PUBLIC_NETWORK_PINS.midnightJs, `${name}@${ver}`);
    }
  }
  assert.equal(pkg.overrides['@midnight-ntwrk/onchain-runtime-v3'], PUBLIC_NETWORK_PINS.onchainRuntimeV3);
});
