import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { openCheck } from './playwright-web-helpers.mjs';

const VERCEL_URL = process.env.PLAYWRIGHT_WEB_URL || 'https://cohort-web-orcin.vercel.app';

async function launch() {
  return chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ channel: 'msedge', headless: true }),
  );
}

function injectConnectorScript() {
  window.midnight = {
    mnLace: {
      rdns: 'io.lace.midnight',
      name: 'Lace',
      icon: 'https://www.lace.io/favicon.ico',
      apiVersion: '4.0.1',
      connect(networkId) {
        return Promise.resolve({
          getConnectionStatus: async () => ({ status: 'connected', networkId: networkId || 'preprod' }),
          getConfiguration: async () => ({
            networkId: 'preprod',
            indexerUri: 'https://indexer.preprod.midnight.network/api/v4/graphql',
          }),
          getDustBalance: async () => ({ balance: 1n, cap: 10n }),
        });
      },
    },
    '1am': {
      rdns: 'com.midnight.1am',
      name: '1AM',
      icon: 'https://1am.xyz/favicon.ico',
      apiVersion: '4.0.1',
      getProvingProvider() {
        return {};
      },
      connect(networkId) {
        return Promise.resolve({
          getProvingProvider() {
            return {};
          },
          getConnectionStatus: async () => ({ status: 'connected', networkId: networkId || 'preprod' }),
          getConfiguration: async () => ({ networkId: 'preprod' }),
          getDustBalance: async () => ({ balance: 1n, cap: 10n }),
        });
      },
    },
  };
}

async function fillEligible(page) {
  await page.locator('input[id^="age-"]').fill('32');
  await page.getByRole('button', { name: 'Yes — you have this diagnosis' }).click();
  await page.getByRole('group', { name: /Are you taking/i }).getByRole('button', { name: 'No' }).click();
  await page
    .getByRole('group', { name: /proof covers the supported typed criteria/i })
    .getByRole('button', { name: 'Yes' })
    .click();
  await page.getByRole('button', { name: 'Prove eligibility' }).click();
  await page.getByRole('heading', { name: /Checking your eligibility privately/i }).waitFor({ timeout: 15000 });
}

test('Vercel: injected Lace connects and fail-closes proving without a fake tx', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await page.addInitScript(injectConnectorScript);
    await openCheck(page, VERCEL_URL);
    await fillEligible(page);
    await page.getByRole('button', { name: 'Connect', exact: true }).nth(1).click();
    await page.getByRole('status').filter({ hasText: /Lace connected\. Proof support for this flow is unavailable/i }).waitFor({
      timeout: 15000,
    });
    const body = await page.innerText('body');
    assert.match(body, /Lace connected/);
    assert.match(body, /Proof support for this flow is unavailable in the current Lace environment/);
    assert.doesNotMatch(body, /0x[0-9a-f]{16}/i);
    assert.equal(await page.getByRole('heading', { name: /^Eligible$/i }).count(), 0);
    assert.equal(await page.getByRole('heading', { name: /Eligibility verified/i }).count(), 0);
  } finally {
    await browser.close();
  }
});

test('Vercel: injected 1AM connect stays on Approve and does not invent confirmed', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await page.addInitScript(injectConnectorScript);
    await openCheck(page, VERCEL_URL);
    await fillEligible(page);
    await page.getByRole('button', { name: 'Connect', exact: true }).first().click();
    await page
      .getByText(/Approve in 1AM|Creating proof|Requesting wallet approval|Proving or submission failed/i)
      .first()
      .waitFor({ timeout: 20000 });
    const body = await page.innerText('body');
    assert.doesNotMatch(body, /Proof support for this flow is unavailable/);
    assert.equal(await page.getByRole('heading', { name: /^Eligible$/i }).count(), 0);
    assert.doesNotMatch(body, /0x[0-9a-f]{16}/i);
  } finally {
    await browser.close();
  }
});

test('Vercel: remembered rdns shows Reconnect without pretending the wallet is connected', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cohort.wallet.rdns', 'io.lace.midnight');
      } catch {
        /* ignore */
      }
    });
    await page.addInitScript(injectConnectorScript);
    await page.goto(VERCEL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: /Reconnect (wallet|Lace|1AM)/i }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Connect 1AM' }).waitFor({ timeout: 15000 });
    const body = await page.innerText('body');
    assert.match(body, /Reconnect/);
    assert.match(body, /Connect 1AM/);
    assert.doesNotMatch(body, /Lace connected/);
    assert.doesNotMatch(body, /1AM connected/);
    const store = await page.evaluate(() => localStorage.getItem('cohort.wallet.rdns'));
    assert.equal(store, 'io.lace.midnight');
  } finally {
    await browser.close();
  }
});

test('Vercel: hanging UUID Lace connect keeps the picker and does not show 1AM waiting copy', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.midnight = {
        'de92e046-24e0-416c-a936-be8b5ba38a07': {
          rdns: 'io.lace.wallet',
          name: 'lace',
          apiVersion: '4.0.1',
          connect() {
            return new Promise(() => {});
          },
        },
        '1am': {
          rdns: 'com.midnight.1am',
          name: '1AM',
          icon: 'https://1am.xyz/favicon.ico',
          apiVersion: '4.0.1',
          getProvingProvider() {
            return {};
          },
          connect(networkId) {
            return Promise.resolve({
              getProvingProvider() {
                return {};
              },
              getConnectionStatus: async () => ({ status: 'connected', networkId: networkId || 'preprod' }),
              getConfiguration: async () => ({ networkId: 'preprod' }),
              getDustBalance: async () => ({ balance: 1n, cap: 10n }),
            });
          },
        },
      };
    });
    await openCheck(page, VERCEL_URL);
    await fillEligible(page);
    await page.getByRole('button', { name: 'Connect', exact: true }).nth(1).click();
    await page.getByRole('button', { name: /Connecting to Lace · Cancel/i }).first().waitFor({ timeout: 15000 });
    const body = await page.innerText('body');
    assert.match(body, /Approve the Lace authorization popup/);
    assert.match(body, /Connect your wallet/);
    assert.doesNotMatch(body, /Still waiting on 1AM/);
    assert.doesNotMatch(body, /Approve in 1AM/);
    assert.equal(await page.getByRole('button', { name: 'Connect', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Connecting', exact: true }).count(), 1);
    await page.getByRole('button', { name: /Connecting to Lace · Cancel/i }).first().click();
    await page.getByRole('button', { name: 'Connect', exact: true }).nth(1).waitFor({ timeout: 10000 });
    const after = await page.innerText('body');
    assert.match(after, /Connect your wallet/);
    assert.doesNotMatch(after, /Connecting to Lace · Cancel/);
  } finally {
    await browser.close();
  }
});
