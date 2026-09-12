import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'web');
const PATIENT_A = 31;

function launchChromium() {
  return import('playwright-core').then(({ chromium }) =>
    chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
      chromium.launch({ channel: 'msedge', headless: true }),
    ),
  );
}

function startNext(port) {
  const bin = path.join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [bin, 'start', '-p', String(port)], {
    cwd: webDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return child;
}

function waitForOutput(child, re, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('next start timed out')), ms);
    const onData = (buf) => {
      const text = String(buf);
      if (re.test(text)) {
        clearTimeout(timer);
        child.stdout?.off('data', onData);
        child.stderr?.off('data', onData);
        resolve();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`next start exited ${code}`));
    });
  });
}

test('Playwright: designer UI does not send PATIENT_A age to COHORT APIs', async (t) => {
  assert.equal(fs.existsSync(path.join(webDir, '.next')), true, 'web/.next build is required');
  const port = 3010;
  const child = startNext(port);
  t.after(() => {
    child.kill('SIGTERM');
  });
  await waitForOutput(child, /Ready|started|localhost/i, 60000);

  const browser = await launchChromium();
  t.after(() => browser.close().catch(() => {}));
  const page = await browser.newPage();
  const leaked = [];
  page.on('request', (req) => {
    const urlStr = req.url();
    const post = req.postData() || '';
    const hay = `${urlStr}\n${post}`;
    const hitsAge =
      hay.includes(`"${PATIENT_A}"`) ||
      hay.includes(`:${PATIENT_A}`) ||
      hay.includes(`age=${PATIENT_A}`) ||
      hay.includes('"age":31');
    const isRemote =
      urlStr.includes('cohort-y4zr.onrender.com') ||
      urlStr.includes('/api/') ||
      urlStr.includes('vercel.app');
    if (isRemote && hitsAge) leaked.push({ url: urlStr, post });
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Find a trial' }).click();
  await page.getByRole('button', { name: /Check privately/i }).first().click();
  const age = page.locator('input[id^="age-"]');
  await age.waitFor({ timeout: 15000 });
  await age.fill(String(PATIENT_A));
  assert.equal(leaked.length, 0, JSON.stringify(leaked));

  const postTrials = await page.evaluate(async () => {
    const res = await fetch('/api/trials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ age: 31, condition: true, medication: false }),
    });
    return { status: res.status, text: await res.text() };
  });
  assert.equal(postTrials.status, 400);
  assert.equal(postTrials.text.includes('31'), false);

  const storage = await page.evaluate(() => ({
    href: location.href,
    cookie: document.cookie,
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  assert.equal(storage.href.includes(String(PATIENT_A)), false);
  assert.equal(storage.cookie.includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.local).includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.session).includes(String(PATIENT_A)), false);
});

const VERCEL_URL = process.env.PLAYWRIGHT_WEB_URL || 'https://cohort-web-orcin.vercel.app';

test('Playwright Vercel: PATIENT_A age never appears on COHORT or Vercel API traffic', async (t) => {
  const browser = await launchChromium();
  t.after(() => browser.close().catch(() => {}));
  const page = await browser.newPage();
  const leaked = [];
  page.on('request', (req) => {
    const urlStr = req.url();
    const post = req.postData() || '';
    const hay = `${urlStr}\n${post}`;
    const hitsAge =
      hay.includes(`"${PATIENT_A}"`) ||
      hay.includes(`:"${PATIENT_A}"`) ||
      hay.includes(`:${PATIENT_A}`) ||
      hay.includes(`age=${PATIENT_A}`) ||
      hay.includes('"age":31');
    let dest;
    try {
      dest = new URL(urlStr);
    } catch {
      dest = { hostname: urlStr, search: '' };
    }
    const isWatched =
      dest.hostname.includes('vercel.app') ||
      dest.hostname.includes('cohort-y4zr.onrender.com') ||
      dest.hostname.includes('google-analytics') ||
      dest.hostname.includes('posthog') ||
      dest.hostname.includes('sentry');
    if (isWatched && hitsAge) leaked.push({ url: urlStr, post });
    if (dest.search && String(dest.search).includes(String(PATIENT_A))) {
      leaked.push({ url: urlStr, post: 'query' });
    }
  });

  await page.goto(VERCEL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Find a trial' }).click();
  await page.getByRole('button', { name: /Check privately/i }).first().click();
  const age = page.locator('input[id^="age-"]');
  await age.waitFor({ timeout: 20000 });
  await age.fill(String(PATIENT_A));
  await page.getByRole('button', { name: /^Yes$/ }).first().click();
  await page.getByRole('button', { name: /^No$/ }).first().click();
  assert.equal(leaked.length, 0, JSON.stringify(leaked));

  const postTrials = await page.evaluate(async () => {
    const res = await fetch('/api/trials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ age: 31, condition: true, medication: false }),
    });
    return { status: res.status, text: await res.text() };
  });
  assert.equal(postTrials.status, 400);
  assert.equal(postTrials.text.includes('31'), false);

  const storage = await page.evaluate(() => ({
    href: location.href,
    cookie: document.cookie,
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  assert.equal(storage.href.includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.local).includes(String(PATIENT_A)), false);
  assert.equal(JSON.stringify(storage.session).includes(String(PATIENT_A)), false);
});
