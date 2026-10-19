import test from 'node:test';
import assert from 'node:assert/strict';
import { listenServer } from '../apps/api/src/server.mjs';
import { launchWebBrowser } from './playwright-web-helpers.mjs';

const PATIENT_A = 31;
const PATIENT_B = 52;

// NOTE: ignoreHTTPSErrors is set because CI/VM egress runs behind a
// TLS-intercepting proxy whose CA is not in Chromium's trust store
// (curl/node work via SSL_CERT_FILE). It does not weaken any privacy
// assertion here — no test in this file asserts on TLS validity.
function launchChromium() {
  return launchWebBrowser();
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

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
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
