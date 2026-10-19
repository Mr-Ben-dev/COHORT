import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ErrorCode } from '../packages/dapp/src/errors.mjs';
import {
  WALLET_IDS,
  LACE_NO_PROVING_MESSAGE,
  GERO_CLOUD_PROVING_NOTE,
  detectWallets,
  preferredWalletId,
  connectWallet,
  getProvingProvider,
  classifyWalletId,
  findInjectedWallet,
} from '../packages/dapp/src/wallets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Mocks (no real wallet needed)
// ---------------------------------------------------------------------------

function mock1am({ connectable = true, provingHook = true } = {}) {
  const connected = {
    ...(provingHook ? { getProvingProvider: () => 'hook' } : {}),
    getConnectionStatus: async () => ({ status: 'connected', networkId: 'preprod' }),
    hintUsage: async () => {},
    getShieldedAddresses: async () => ({
      shieldedCoinPublicKey: 'cpk',
      shieldedEncryptionPublicKey: 'epk',
    }),
    balanceUnsealedTransaction: async () => ({ tx: 'ff' }),
    submitTransaction: async () => 'txid',
    getDustBalance: async () => '10',
  };
  return {
    name: '1AM',
    rdns: 'com.midnight.1am',
    apiVersion: '4.0.1',
    ...(provingHook ? { getProvingProvider: () => 'hook' } : {}),
    ...(connectable ? { connect: async () => connected } : {}),
    __connected: connected,
  };
}

function mockGero({ connectable = true, provingHook = true, key = 'a1b2c3d4-uuid' } = {}) {
  const connected = {
    ...(provingHook ? { getProvingProvider: () => 'hook' } : {}),
    getConnectionStatus: async () => ({ status: 'connected', networkId: 'preprod' }),
    getShieldedAddresses: async () => ({ shieldedCoinPublicKey: 'g' }),
    getDustBalance: async () => '5',
  };
  return {
    key,
    entry: {
      name: 'GeroWallet',
      rdns: 'io.gerowallet.midnight', // mock value; exact Gero rdns is UNVERIFIED (see docs/wallet-trust.md)
      apiVersion: '4.0.0',
      ...(provingHook ? { getProvingProvider: () => 'hook' } : {}),
      ...(connectable ? { connect: async () => connected } : {}),
    },
  };
}

function mockLace({ connectable = true } = {}) {
  return {
    name: 'Lace',
    rdns: 'io.lace.midnight',
    apiVersion: '4.0.0',
    ...(connectable ? { connect: async () => ({}) } : {}),
  };
}

function withMockedMidnight(midnight, fn) {
  const prev = globalThis.midnight;
  globalThis.midnight = midnight;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete globalThis.midnight;
    else globalThis.midnight = prev;
  }
}

// ---------------------------------------------------------------------------
// detectWallets()
// ---------------------------------------------------------------------------

test('detectWallets returns the fixed 3-row matrix with available/proving flags', () => {
  const gero = mockGero();
  const midnight = { [gero.key]: gero.entry, '1am': mock1am(), mnLace: mockLace() };
  withMockedMidnight(midnight, () => {
    const rows = detectWallets();
    assert.deepEqual(rows.map((r) => r.id), ['gero', '1am', 'lace']);
    assert.deepEqual(rows.map((r) => Object.keys(r).sort()), [
      ['available', 'id', 'proving'],
      ['available', 'id', 'proving'],
      ['available', 'id', 'proving'],
    ]);
    assert.equal(rows[0].available, true);
    assert.equal(rows[0].proving, true);
    assert.equal(rows[1].available, true);
    assert.equal(rows[1].proving, true);
    assert.equal(rows[2].available, true);
    assert.equal(rows[2].proving, false); // Lace: flagged proving:false by design
  });
});

test('detectWallets with no injected global returns all-unavailable matrix', () => {
  withMockedMidnight(undefined, () => {
    const rows = detectWallets();
    assert.deepEqual(WALLET_IDS, ['gero', '1am', 'lace']);
    for (const row of rows) assert.equal(row.available, false);
  });
});

test('classifyWalletId matches Gero via name/rdns, not a fixed key (UUID-keyed model)', () => {
  // Gero injects under a generated UUID per Midnight docs v4; key is unknown.
  assert.equal(classifyWalletId('550e8400-e29b-41d4-a716-446655440000', { name: 'GeroWallet', rdns: 'x.y' }), 'gero');
  assert.equal(classifyWalletId('some-key', { name: 'Midnight wallet', rdns: 'io.gerowallet.midnight' }), 'gero');
  assert.equal(classifyWalletId('1am', { name: '1AM', rdns: 'com.midnight.1am' }), '1am');
  assert.equal(classifyWalletId('mnLace', { name: 'Lace' }), 'lace');
  assert.equal(classifyWalletId('uuid-9', { name: 'Unknown Wallet' }), null);
});

test('findInjectedWallet resolves each id independently', () => {
  const gero = mockGero();
  const midnight = { [gero.key]: gero.entry, '1am': mock1am(), mnLace: mockLace() };
  withMockedMidnight(midnight, () => {
    assert.equal(findInjectedWallet('gero').name, 'GeroWallet');
    assert.equal(findInjectedWallet('1am').name, '1AM');
    assert.equal(findInjectedWallet('lace').name, 'Lace');
  });
});

// ---------------------------------------------------------------------------
// Fallback ordering: gero -> 1am -> (lace never selected)
// ---------------------------------------------------------------------------

test('preferredWalletId: gero primary, 1am fallback, lace never selected', () => {
  const geroOnly = withMockedMidnight({ [mockGero().key]: mockGero().entry }, () =>
    preferredWalletId(),
  );
  assert.equal(geroOnly, 'gero');

  const both = withMockedMidnight({ g: mockGero().entry, '1am': mock1am() }, () => preferredWalletId());
  assert.equal(both, 'gero');

  const oneAmOnly = withMockedMidnight({ '1am': mock1am() }, () => preferredWalletId());
  assert.equal(oneAmOnly, '1am');

  const laceOnly = withMockedMidnight({ mnLace: mockLace() }, () => preferredWalletId());
  assert.equal(laceOnly, null);

  const none = withMockedMidnight({}, () => preferredWalletId());
  assert.equal(none, null);

  const geroNoProving = withMockedMidnight(
    { g: mockGero({ provingHook: false }).entry, '1am': mock1am() },
    () => preferredWalletId(),
  );
  assert.equal(geroNoProving, '1am');
});

// ---------------------------------------------------------------------------
// connectWallet / getProvingProvider
// ---------------------------------------------------------------------------

test('connectWallet(lace) and getProvingProvider(lace) refuse with the honest message', async () => {
  const midnight = { mnLace: mockLace() };
  await withMockedMidnight(midnight, async () => {
    await assert.rejects(() => connectWallet('lace'), (err) => {
      assert.equal(err.code, ErrorCode.WALLET_NO_PROVING);
      assert.equal(err.publicMessage, LACE_NO_PROVING_MESSAGE);
      assert.match(err.publicMessage, /no getProvingProvider/i);
      return true;
    });
    await assert.rejects(() => getProvingProvider('lace'), (err) => {
      assert.equal(err.code, ErrorCode.WALLET_NO_PROVING);
      return true;
    });
  });
});

test('connectWallet(unknown) throws WALLET_UNAVAILABLE', async () => {
  await withMockedMidnight({}, async () => {
    await assert.rejects(() => connectWallet('kuira'), (err) => {
      assert.equal(err.code, ErrorCode.WALLET_UNAVAILABLE);
      return true;
    });
  });
});

test('connectWallet(1am) delegates to the existing 1AM path (not reimplemented)', async () => {
  const midnight = { '1am': mock1am() };
  await withMockedMidnight(midnight, async () => {
    const session = await connectWallet('1am', { networkId: 'preprod' });
    assert.equal(session.id, '1am');
    assert.equal(session.apiName, '1am'); // same shape as wallet.mjs connectWallet
    assert.equal(session.networkId, 'preprod');
    assert.equal(session.proving, 'wasm'); // same hard-coded value as the existing path
    assert.ok(session.api);
  });
});

test('connectWallet(gero) returns a Gero session carrying the trust note', async () => {
  const g = mockGero();
  const midnight = { [g.key]: g.entry };
  await withMockedMidnight(midnight, async () => {
    const session = await connectWallet('gero', { networkId: 'preprod' });
    assert.equal(session.id, 'gero');
    assert.equal(session.proving, true);
    assert.equal(session.trustNote, GERO_CLOUD_PROVING_NOTE);
    assert.match(session.trustNote, /Gero Cloud/);
  });
});

test('connectWallet(gero) throws WALLET_UNAVAILABLE when GeroWallet is not injected', async () => {
  await withMockedMidnight({ '1am': mock1am() }, async () => {
    await assert.rejects(() => connectWallet('gero'), (err) => {
      assert.equal(err.code, ErrorCode.WALLET_UNAVAILABLE);
      assert.match(err.publicMessage, /GeroWallet/);
      return true;
    });
  });
});

test('connectWallet(gero) fails loud when Gero exposes no getProvingProvider', async () => {
  const g = mockGero({ provingHook: false });
  await withMockedMidnight({ [g.key]: g.entry }, async () => {
    await assert.rejects(() => connectWallet('gero'), (err) => {
      assert.equal(err.code, ErrorCode.WALLET_NO_PROVING);
      return true;
    });
  });
});

test('getProvingProvider(gero) binds the proving hook', async () => {
  const g = mockGero();
  await withMockedMidnight({ [g.key]: g.entry }, async () => {
    const { api, getProvingProvider: hook, session } = await getProvingProvider('gero');
    assert.ok(api);
    assert.equal(typeof hook, 'function');
    assert.equal(session.id, 'gero');
  });
});

// ---------------------------------------------------------------------------
// Trust-boundary doc
// ---------------------------------------------------------------------------

test('docs/wallet-trust.md exists and discloses Gero Cloud', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/wallet-trust.md'), 'utf8');
  assert.match(doc, /Gero Cloud/);
  assert.match(doc, /local proof server/);
  assert.match(doc, /NOT verified/i);
  assert.match(doc, /witness/i);
});
