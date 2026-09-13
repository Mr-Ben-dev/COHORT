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
  assert.match(src, /kind === \"1AM\" \|\| typeof api.getProvingProvider/);
});

test('wallet preference is the only localStorage write and is not a medical fact', () => {
  const pref = fs.readFileSync(path.join(root, 'web/src/lib/wallet-preference.ts'), 'utf8');
  assert.match(pref, /cohort\.wallet\.rdns/);
  assert.equal(/\bage\b/.test(pref), false);
  const vault = fs.readFileSync(path.join(root, 'web/src/lib/private-vault.ts'), 'utf8');
  assert.match(vault, /AES-GCM|encryptJson/);
  assert.equal(vault.includes('localStorage'), false);
  assert.match(vault, /indexedDB/);
  assert.match(vault, /profile:\$\{/);
  assert.match(vault, /proofs:\$\{/);
});

test('Lace proving fail-closed copy is present in the wallet modal and proving view', () => {
  const modal = fs.readFileSync(path.join(root, 'web/src/features/wallet/wallet-modal.tsx'), 'utf8');
  assert.match(modal, /connectAndProve\(row\.id\)/);
  assert.match(modal, /proof support for this flow is limited/);
  const picker = fs.readFileSync(path.join(root, 'web/src/features/proving/wallet-picker.tsx'), 'utf8');
  assert.match(picker, /Lace cannot generate this proof/);
  assert.match(picker, /does not open a page popup/);
  const store = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  assert.match(store, /proof support for this flow is limited in the current Lace environment/);
  assert.match(store, /disconnectWallet/);
  assert.match(store, /clearCurrentNamespace/);
  assert.match(store, /cancelConnect/);
  const proving = fs.readFileSync(path.join(root, 'web/src/features/proving/proving-view.tsx'), 'utf8');
  assert.match(proving, /canProve === false/);
  assert.match(proving, /proof support for this flow is limited in the current Lace environment/);
  assert.match(proving, /wallet.status === "connecting" && wallet.provider !== "1AM"/);
  assert.match(proving, /Approve the Lace authorization popup/);
  const wallet = fs.readFileSync(path.join(root, 'web/src/services/wallet.ts'), 'utf8');
  assert.match(wallet, /abandonPendingConnect/);
  assert.match(wallet, /WALLET_SUPERSEDED/);
  const bar = fs.readFileSync(path.join(root, 'web/src/features/wallet/wallet-bar.tsx'), 'utf8');
  assert.match(bar, /Connect wallet/);
  assert.match(bar, /Disconnect/);
  assert.match(bar, /cancelConnect/);
  const nav = fs.readFileSync(path.join(root, 'web/src/components/layout/site-nav.tsx'), 'utf8');
  assert.match(nav, /WalletBar/);
});
