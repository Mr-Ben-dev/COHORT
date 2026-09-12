import test from 'node:test';
import assert from 'node:assert/strict';
import { connectWallet, discoverWallets, getWalletState } from '../packages/dapp/src/wallet.mjs';
import { CohortError, ErrorCode } from '../packages/dapp/src/errors.mjs';

test('Node has no injected wallet and does not invent one', async () => {
  assert.deepEqual(discoverWallets(), []);
  const state = getWalletState();
  assert.equal(state.lifecycle, 'DISCONNECTED');
  await assert.rejects(
    () => connectWallet(),
    (err) => {
      assert.equal(err instanceof CohortError, true);
      assert.equal(err.code, ErrorCode.WALLET_UNAVAILABLE);
      assert.equal(String(err.publicMessage).includes('1AM'), true);
      return true;
    },
  );
});
