/** Shared Playwright helpers for the designer UI on Vercel or local Next. */

function trialsHeading(page) {
  return page.getByRole('heading', { name: /Find (a clinical trial|trials for me)/i });
}

function visibleFindATrial(page) {
  return page.getByRole('button', { name: 'Find a trial', exact: true }).filter({ visible: true });
}

async function clickTrialsTarget(page) {
  const navFindTrials = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Find Trials', exact: true });
  if (await navFindTrials.isVisible().catch(() => false)) {
    await navFindTrials.click();
    return;
  }
  const cta = visibleFindATrial(page).first();
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
    return;
  }
  const openMenu = page.getByRole('button', { name: 'Open menu' });
  await openMenu.click();
  await page.getByRole('button', { name: 'Find Trials', exact: true }).click();
}

export async function goToTrials(page) {
  await page.bringToFront();
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ timeout: 30000 });
  const heading = trialsHeading(page);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await heading.isVisible().catch(() => false)) return;
    await clickTrialsTarget(page);
    try {
      await heading.waitFor({ timeout: 2500 });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  const body = await page.innerText('body').catch(() => '');
  throw new Error(`trials view did not open\n--- body ---\n${body.slice(0, 1800)}`);
}

export async function waitForCheckPrivately(page) {
  const checkBtn = page.getByRole('button', { name: /Check privately/i }).first();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await checkBtn.waitFor({ timeout: 20000 });
      return checkBtn;
    } catch (err) {
      const retry = page.getByRole('button', { name: 'Try again' });
      if (await retry.count()) {
        await retry.click();
        continue;
      }
      if (attempt === 3) {
        const body = await page.innerText('body').catch(() => '');
        throw new Error(`${err.message}\n--- body ---\n${body.slice(0, 1800)}`);
      }
    }
  }
  return checkBtn;
}

export async function openCheck(page, origin) {
  await page.bringToFront();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await goToTrials(page);
  const checkBtn = await waitForCheckPrivately(page);
  await checkBtn.click();
  await page.locator('input[id^="age-"]').waitFor({ timeout: 20000 });
}

/**
 * Launch Chromium for the Vercel web tests.
 *
 * Environment knobs (unset = repo defaults, unchanged behavior):
 * - PLAYWRIGHT_CHROME_PATH: executablePath to use instead of channel lookup
 *   (this VM has no channel 'chrome'/'msedge'; the Playwright-cached
 *   chromium-1248 build works, /opt/meta-chromium/chrome is blocked by its
 *   Local Network Access checks for localhost).
 * - PLAYWRIGHT_NO_SANDBOX=1: pass --no-sandbox (required in containers where
 *   the Chromium sandbox cannot start; without it launch hangs forever).
 * - PLAYWRIGHT_PROXY_FORWARD=1: run a tiny localhost forward proxy that
 *   injects Proxy-Authorization (read from the *http_proxy env at runtime,
 *   never hardcoded) and point Chromium at it. Needed because this VM's
 *   egress proxy drops unauthenticated CONNECTs instead of answering 407,
 *   so Chromium's challenge/response proxy auth never engages.
 *
 * Falls back to the historical channel:'chrome' -> channel:'msedge' chain.
 */
import net from 'node:net';

let forwardProxy = null;

/** Localhost TCP relay that injects Proxy-Authorization for the egress proxy. */
async function ensureAuthForwardProxy() {
  if (forwardProxy) return forwardProxy.port;
  const raw =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!raw) throw new Error('PLAYWRIGHT_PROXY_FORWARD=1 but no *http_proxy env set');
  const u = new URL(raw);
  const auth =
    'Basic ' +
    Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64');
  const targetHost = u.hostname;
  const targetPort = Number(u.port) || 3128;
  const server = net.createServer((client) => {
    let head = Buffer.alloc(0);
    const onData = (chunk) => {
      head = Buffer.concat([head, chunk]);
      const idx = head.indexOf('\r\n\r\n');
      if (idx === -1) return;
      client.off('data', onData);
      let headStr = head.slice(0, idx).toString('latin1');
      const rest = head.slice(idx + 4);
      if (!/proxy-authorization:/i.test(headStr)) {
        headStr = headStr.replace('\r\n', `\r\nProxy-Authorization: ${auth}\r\n`);
      }
      const upstream = net.connect(targetPort, targetHost, () => {
        upstream.write(headStr + '\r\n\r\n');
        if (rest.length) upstream.write(rest);
        client.pipe(upstream);
        upstream.pipe(client);
      });
      const destroy = () => {
        client.destroy();
        upstream.destroy();
      };
      upstream.on('error', destroy);
      client.on('error', destroy);
    };
    client.on('data', onData);
    client.on('error', () => {});
  });
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref();
  forwardProxy = { server, port: server.address().port };
  return forwardProxy.port;
}

function proxyBypass() {
  const raw = process.env.NO_PROXY || process.env.no_proxy || '';
  const parts = raw
    .split(',')
    .map((x) => x.trim().replace(/^\[|\]$/g, ''))
    .filter(Boolean);
  for (const must of ['localhost', '127.0.0.1']) {
    if (!parts.includes(must)) parts.push(must);
  }
  return parts.join(',');
}

export async function launchWebBrowser() {
  const { chromium } = await import('playwright-core');
  const args = [];
  if (process.env.PLAYWRIGHT_NO_SANDBOX === '1') args.push('--no-sandbox');
  const opts = { headless: true, args };
  if (process.env.PLAYWRIGHT_PROXY_FORWARD === '1') {
    const port = await ensureAuthForwardProxy();
    opts.proxy = { server: `http://127.0.0.1:${port}`, bypass: proxyBypass() };
  }
  if (process.env.PLAYWRIGHT_CHROME_PATH) {
    opts.executablePath = process.env.PLAYWRIGHT_CHROME_PATH;
    return chromium.launch(opts);
  }
  return chromium.launch({ ...opts, channel: 'chrome' }).catch(() =>
    chromium.launch({ ...opts, channel: 'msedge' }),
  );
}
