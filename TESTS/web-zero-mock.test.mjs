import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webSrc = path.join(root, 'web/src');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(ent.name)) out.push(p);
  }
  return out;
}

test('designer web production path does not import fixture trials or simulated wallet/proof', () => {
  const files = walk(webSrc).filter((p) => !p.includes(`${path.sep}fixtures${path.sep}`));
  const hay = files.map((p) => `${p}\n${fs.readFileSync(p, 'utf8')}`).join('\n');
  assert.equal(hay.includes('DevelopmentWalletService'), false);
  assert.equal(hay.includes('SimulatedProofService'), false);
  assert.equal(/from ["']@\/fixtures\/trials["']/.test(hay), false);
  assert.equal(hay.includes('fullProofRef()'), false);
  assert.equal(hay.includes('setTimeout(() => success'), false);
  assert.match(fs.readFileSync(path.join(webSrc, 'services/wallet.ts'), 'utf8'), /connect\(['"]preprod['"]\)/);
  assert.match(fs.readFileSync(path.join(webSrc, 'services/wallet.ts'), 'utf8'), /isOneAmInjected/);
  assert.match(fs.readFileSync(path.join(webSrc, 'state/cohort-store.ts'), 'utf8'), /connectAndProve/);
  assert.match(
    fs.readFileSync(path.join(webSrc, 'features/proving/proving-view.tsx'), 'utf8'),
    /connectAndProve\(provider\.id\)/,
  );
  assert.match(
    fs.readFileSync(path.join(webSrc, 'features/proving/proving-view.tsx'), 'utf8'),
    /does not open a page popup/,
  );
  assert.match(fs.readFileSync(path.join(webSrc, 'services/proof.ts'), 'utf8'), /proveEligibility/);
  assert.match(fs.readFileSync(path.join(webSrc, 'services/trials.ts'), 'utf8'), /\/api\/trials/);
  assert.equal(/\$\{referral\.bounty\}/.test(hay), false);
  assert.equal(hay.includes('Referral bounty'), false);
  assert.equal(hay.includes('Daily refresh'), false);
});

test('GET /api/trials (live Render) is typed CT.gov subset, not designer fixtures', async () => {
  const res = await fetch('https://cohort-y4zr.onrender.com/api/trials');
  assert.equal(res.status, 200);
  const body = await res.json();
  const ids = (body.trials || []).map((t) => t.trialId);
  assert.ok(ids.includes('NCT07153614'));
  assert.equal(ids.includes('NCT06218473'), false);
  const nct = body.trials.find((t) => t.trialId === 'NCT07153614');
  assert.equal(nct.minAge, 18);
  assert.equal(nct.age, undefined);
});
