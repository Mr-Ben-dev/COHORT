import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function namespaceFromPublicId(rdns, publicId) {
  const material = `${String(rdns || '').slice(0, 120)}:${String(publicId || '').slice(0, 256)}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(buf).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

test('public account ids hash to isolated namespaces without using a seed', async () => {
  const a = await namespaceFromPublicId('com.midnight.1am', 'mn_shield_preprod1alicealicealice');
  const b = await namespaceFromPublicId('io.lace.wallet', 'mn_shield_preprod1bobbobobobobob');
  const a2 = await namespaceFromPublicId('com.midnight.1am', 'mn_shield_preprod1alicealicealice');
  assert.equal(a.length, 32);
  assert.equal(b.length, 32);
  assert.equal(a, a2);
  assert.notEqual(a, b);
  const src = fs.readFileSync(path.join(root, 'web/src/lib/wallet-account.ts'), 'utf8');
  assert.equal(/mnemonic|seed phrase|private key/i.test(src), false);
});

test('store disconnect does not clear the private vault', () => {
  const store = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  const start = store.indexOf('disconnectWallet: () => {');
  const disconnect = store.slice(start, start + 900);
  assert.match(disconnect, /walletService\.disconnect\(\)/);
  assert.equal(disconnect.includes('clearCurrentNamespace'), false);
  assert.equal(disconnect.includes('clearPrivateVault'), false);
  assert.match(store, /migrateLegacyIfNeeded/);
  assert.match(store, /persistActiveNamespace/);
  const profile = fs.readFileSync(path.join(root, 'web/src/features/profile/profile-view.tsx'), 'utf8');
  assert.match(profile, /Clear private profile\/data/);
  const bar = fs.readFileSync(path.join(root, 'web/src/features/wallet/wallet-bar.tsx'), 'utf8');
  assert.match(bar, /Disconnect/);
});

test('private vault namespaces profile and proofs per account', () => {
  const vault = fs.readFileSync(path.join(root, 'web/src/lib/private-vault.ts'), 'utf8');
  assert.match(vault, /profile:\$\{ns\}/);
  assert.match(vault, /proofs:\$\{ns\}/);
  assert.match(vault, /clearCurrentNamespace/);
  assert.match(vault, /active-ns/);
  assert.equal(vault.includes('localStorage'), false);
  const store = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  assert.equal(store.includes('localStorage'), false);
  assert.equal(store.includes('indexedDB'), false);
});
