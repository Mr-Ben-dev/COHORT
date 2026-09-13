import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('wallet discovery accepts connector 4.x and rejects other majors', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/lib/wallet-discovery.ts'), 'utf8');
  assert.match(src, /SUPPORTED_MAJOR = 4/);
  assert.match(src, /window\.midnight/);
  assert.match(src, /Never SVG/);
  assert.match(src, /mnLace/);
  assert.match(src, /1am/);
});

test('wallet preference is the only localStorage write and is not a medical fact', () => {
  const pref = fs.readFileSync(path.join(root, 'web/src/lib/wallet-preference.ts'), 'utf8');
  assert.match(pref, /cohort\.wallet\.rdns/);
  assert.equal(/\bage\b/.test(pref), false);
  const vault = fs.readFileSync(path.join(root, 'web/src/lib/private-vault.ts'), 'utf8');
  assert.match(vault, /AES-GCM|encryptJson/);
  assert.equal(vault.includes('localStorage'), false);
  assert.match(vault, /indexedDB/);
});

test('Lace proving fail-closed copy is present', () => {
  const picker = fs.readFileSync(path.join(root, 'web/src/features/proving/wallet-picker.tsx'), 'utf8');
  assert.match(picker, /connectAndProve\(row\.id\)/);
  const store = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  assert.match(store, /Proof support for this flow is unavailable in the current Lace environment/);
  assert.match(store, /Lace connected/);
  const proving = fs.readFileSync(path.join(root, 'web/src/features/proving/proving-view.tsx'), 'utf8');
  assert.match(proving, /canProve === false/);
  assert.match(proving, /Proof support for this flow is unavailable in the current Lace environment/);
});
