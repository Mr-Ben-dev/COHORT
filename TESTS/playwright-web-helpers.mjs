/** Shared Playwright helpers for the designer UI on Vercel or local Next. */

function trialsHeading(page) {
  return page.getByRole('heading', { name: /Find a clinical trial/i });
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
