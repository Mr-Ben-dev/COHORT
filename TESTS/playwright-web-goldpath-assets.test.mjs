import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { openCheck } from './playwright-web-helpers.mjs';

const VERCEL_URL = process.env.PLAYWRIGHT_WEB_URL || 'https://cohort-web-orcin.vercel.app';
const RENDER = 'https://cohort-y4zr.onrender.com';

async function launch() {
  return chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ channel: 'msedge', headless: true }),
  );
}

test('Vercel page can load CohortDapp wasm, Render /zk keys, and indexer public state', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const failures = [];
  const csp = [];
  page.on('requestfailed', (req) => {
    failures.push({ url: req.url(), error: req.failure()?.errorText });
  });
  page.on('console', (msg) => {
    const text = msg.text();
    if (/content security policy|csp|refused to connect|failed to fetch .*wasm/i.test(text)) {
      csp.push(text);
    }
  });
  try {
    await page.goto(VERCEL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ timeout: 30000 });

    const assets = await page.evaluate(async (render) => {
      const wasmUrl = new URL('/dapp/midnight_onchain_runtime_wasm_bg.wasm', location.href).href;
      const dappUrl = new URL('/dapp/cohort-dapp.js', location.href).href;
      const [wasm, verifier, compiler] = await Promise.all([
        fetch(wasmUrl),
        fetch(`${render}/zk/keys/proveEligible.verifier`),
        fetch(`${render}/zk/compiler/contract-info.json`),
      ]);
      const info = await compiler.json();
      const mod = await import(/* @vite-ignore */ dappUrl);
      const verification = await mod.CohortDapp.getPublicVerification();
      return {
        wasmStatus: wasm.status,
        wasmType: wasm.headers.get('content-type'),
        verifierStatus: verifier.status,
        verifierBytes: (await verifier.arrayBuffer()).byteLength,
        compiler: info['compiler-version'],
        language: info['language-version'],
        runtime: info['runtime-version'],
        unwrapV9: typeof mod.unwrapV9,
        proven: verification.proven,
        source: verification.source,
        contract: verification.contractAddress,
        hasProve: typeof mod.CohortDapp.proveEligibility,
      };
    }, RENDER);

    assert.equal(assets.wasmStatus, 200, JSON.stringify(assets));
    assert.match(String(assets.wasmType), /wasm/);
    assert.equal(assets.verifierStatus, 200);
    assert.equal(assets.verifierBytes > 32, true);
    assert.equal(assets.compiler, '0.31.1');
    assert.match(String(assets.language), /^0\.23/);
    assert.equal(assets.runtime, '0.16.0');
    assert.equal(assets.unwrapV9, 'undefined');
    assert.equal(assets.source, 'midnight-indexer');
    assert.equal(
      assets.contract,
      '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc',
    );
    assert.equal(assets.proven >= 2, true, JSON.stringify(assets));
    assert.equal(assets.hasProve, 'function');
    assert.equal(csp.length, 0, JSON.stringify(csp));
    const blocked = failures.filter((f) => /dapp\/|\/zk\/|indexer\.preprod/i.test(f.url));
    assert.equal(blocked.length, 0, JSON.stringify(blocked));
  } finally {
    await browser.close();
  }
});

test('Vercel proving view preloads dapp without sending private facts', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const leaked = [];
  page.on('request', (req) => {
    const hay = `${req.url()}\n${req.postData() || ''}`;
    if (
      (hay.includes('cohort-y4zr.onrender.com') || hay.includes('/api/')) &&
      (hay.includes('"age":32') || hay.includes('age=32') || hay.includes(':32,'))
    ) {
      leaked.push({ url: req.url(), post: req.postData() });
    }
  });
  try {
    await openCheck(page, VERCEL_URL);
    await page.locator('input[id^="age-"]').fill('32');
    await page.getByRole('button', { name: 'Yes — you have this diagnosis' }).click();
    await page
      .getByRole('group', { name: /Are you taking/i })
      .getByRole('button', { name: 'No' })
      .click();
    await page
      .getByRole('group', { name: /proof covers the supported typed criteria/i })
      .getByRole('button', { name: 'Yes' })
      .click();
    await page.getByRole('button', { name: 'Prove eligibility' }).click();
    await page.getByRole('heading', { name: /Checking your eligibility privately/i }).waitFor({ timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2500));
    const loaded = await page.evaluate(async () => {
      const mod = await import('/dapp/cohort-dapp.js');
      return typeof mod.CohortDapp.proveEligibility === 'function';
    });
    assert.equal(loaded, true);
    assert.equal(leaked.length, 0, JSON.stringify(leaked));
    await page.getByRole('button', { name: 'Connect' }).first().waitFor();
  } finally {
    await browser.close();
  }
});
