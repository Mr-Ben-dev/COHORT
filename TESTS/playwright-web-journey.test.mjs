import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { openCheck as openCheckAt } from './playwright-web-helpers.mjs';

const VERCEL_URL = process.env.PLAYWRIGHT_WEB_URL || 'https://cohort-web-orcin.vercel.app';

async function launch() {
  return chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ channel: 'msedge', headless: true }),
  );
}

async function openCheck(page) {
  await openCheckAt(page, VERCEL_URL);
}

async function completeTypedForm(page, { age, condition, medication }) {
  await page.locator('input[id^="age-"]').fill(String(age));
  await page.getByRole('button', { name: condition ? 'Yes — you have this diagnosis' : 'No — you do not have this diagnosis' }).click();
  await page
    .getByRole('group', { name: /Are you taking/i })
    .getByRole('button', { name: medication ? 'Yes' : 'No' })
    .click();
  await page
    .getByRole('group', { name: /proof covers the supported typed criteria/i })
    .getByRole('button', { name: 'Yes' })
    .click();
  await page.getByRole('button', { name: 'Prove eligibility' }).click();
}

test('Vercel: too-young local preview is ineligible and invents no tx', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await openCheck(page);
    await completeTypedForm(page, { age: 17, condition: true, medication: false });
    await page.getByRole('heading', { name: /Not eligible/i }).waitFor({ timeout: 15000 });
    const body = await page.innerText('body');
    assert.match(body, /Not eligible/i);
    assert.doesNotMatch(body, /Verified/i);
    assert.doesNotMatch(body, /0x[0-9a-f]{16}/i);
    assert.match(body, /nothing was shared/i);
    assert.match(body, /No wallet was connected/i);
    assert.equal(await page.getByRole('button', { name: 'Connect' }).count(), 0);
  } finally {
    await browser.close();
  }
});

test('Vercel: eligible preview waits for 1AM and does not fake confirmed', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await openCheck(page);
    await completeTypedForm(page, { age: 32, condition: true, medication: false });
    await page.getByRole('heading', { name: /Checking your eligibility privately/i }).waitFor({ timeout: 15000 });
    const body = await page.innerText('body');
    assert.match(body, /Connect your wallet|1AM/i);
    assert.match(body, /typed criteria only/i);
    assert.match(body, /does not open a page popup/i);
    assert.match(body, /Looking for the 1AM|is injected|not injected/i);
    assert.match(body, /Connect/);
    assert.equal(await page.getByRole('heading', { name: /^Eligible$/i }).count(), 0);
    await page.getByRole('button', { name: 'Connect' }).first().waitFor();
  } finally {
    await browser.close();
  }
});

test('Vercel: two contexts do not share private age answers', async () => {
  const browser = await launch();
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  try {
    await openCheck(pageA);
    await pageA.locator('input[id^="age-"]').fill('31');
    await openCheck(pageB);
    await pageB.locator('input[id^="age-"]').fill('52');
    const ageA = await pageA.locator('input[id^="age-"]').inputValue();
    const ageB = await pageB.locator('input[id^="age-"]').inputValue();
    assert.equal(ageA, '31');
    assert.equal(ageB, '52');
    const storeA = await pageA.evaluate(() => JSON.stringify(localStorage));
    const storeB = await pageB.evaluate(() => JSON.stringify(localStorage));
    assert.equal(storeA.includes('31'), false);
    assert.equal(storeB.includes('52'), false);
  } finally {
    await browser.close();
  }
});

test('Vercel mobile viewport: trial check is usable without a fake wallet', async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await openCheck(page);
    const body = await page.innerText('body');
    assert.match(body, /Let's check privately|check privately/i);
    assert.match(body, /stays on this device/i);
    assert.equal(body.toLowerCase().includes('fake wallet'), false);
  } finally {
    await browser.close();
  }
});

test('Vercel: private profile finds potential matches without posting facts', async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const leaked = [];
  page.on('request', (req) => {
    const url = req.url();
    const post = req.postData() || '';
    if (/[?&]age=/.test(url) || /"age"\s*:/.test(post) || post.includes('"31"')) {
      leaked.push(`${req.method()} ${url}`.slice(0, 200));
    }
  });
  try {
    await page.goto(VERCEL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'My Profile', exact: true }).click();
    await page.getByRole('heading', { name: /These facts stay on your device/i }).waitFor({ timeout: 15000 });
    await page.locator('#profile-age').fill('31');
    await page.getByRole('group', { name: 'Mapped condition flag' }).getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('group', { name: 'Excluded medication flag' }).getByRole('button', { name: 'No' }).click();
    await page.getByRole('button', { name: 'Find trials for me' }).click();
    await page.getByRole('heading', { name: /Find trials for me/i }).waitFor({ timeout: 20000 });
    const body = await page.innerText('body');
    assert.match(body, /Potential match/i);
    assert.doesNotMatch(body, /Site received/i);
    const store = await page.evaluate(() => JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }));
    assert.equal(store.includes('31'), false);
    assert.equal(leaked.length, 0, leaked.join('\n'));
  } finally {
    await browser.close();
  }
});
