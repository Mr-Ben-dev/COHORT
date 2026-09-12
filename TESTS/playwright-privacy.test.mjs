import test from 'node:test';
import assert from 'node:assert/strict';
import { listenServer } from '../apps/api/src/server.mjs';

const PATIENT_A = 31;
const PATIENT_B = 52;

function launchChromium() {
  return import('playwright-core').then(({ chromium }) =>
    chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
      chromium.launch({ channel: 'msedge', headless: true }),
    ),
  );
}

test('Playwright Chromium: PATIENT_A/B ages stay off COHORT origin traffic and storage', async (t) => {
  let browser;
  try {
    browser = await launchChromium();
  } catch (err) {
    assert.fail(`Playwright could not launch Chrome/Edge: ${err?.message || err}`);
  }
  const { server, url } = await listenServer();
  t.after(async () => {
    await browser.close().catch(() => {});
    server.close();
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const leaked = [];
  page.on('request', (req) => {
    const urlStr = req.url();
    let dest;
    try {
      dest = new URL(urlStr);
    } catch {
      dest = { host: urlStr, search: urlStr };
    }
    const post = req.postData() || '';
    const hay = `${urlStr}\n${post}`;
    const hitsAge = hay.includes(`"${PATIENT_A}"`) || hay.includes(`:${PATIENT_A}`) || hay.includes(`age=${PATIENT_A}`) || hay.includes(`age=${PATIENT_B}`);
    const isCohortOrigin = urlStr.startsWith(url);
    if (isCohortOrigin && hitsAge) leaked.push({ url: urlStr, post });
    if (dest.search && String(dest.search).includes(String(PATIENT_A))) leaked.push({ url: urlStr, post: 'query' });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.fill('#age', String(PATIENT_A));
  await page.selectOption('#condition', 'true');
  await page.selectOption('#medication', 'false');
  await page.click('#prove');
  await page.waitForFunction(() => Boolean(document.getElementById('status')?.textContent?.trim()));

  const storage = await page.evaluate(() => ({
    href: location.href,
    cookie: document.cookie,
    local: { ...localStorage },
    session: { ...sessionStorage },
    status: document.getElementById('status')?.textContent || '',
  }));

  assert.equal(storage.href.includes(String(PATIENT_A)), false, storage.href);
  assert.equal(storage.cookie.includes(String(PATIENT_A)), false, storage.cookie);
  assert.equal(JSON.stringify(storage.local).includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.session).includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.local).includes(String(PATIENT_B)), false);
  assert.match(
    storage.status,
    /No Midnight DApp Connector found|Connect a Midnight wallet first|complete private facts|Not proven locally|will not generate a fake transaction/i,
  );
  assert.equal(leaked.length, 0, JSON.stringify(leaked));
});
