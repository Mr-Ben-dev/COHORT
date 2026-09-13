import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('private match reasons never interpolate the user age or flags', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/lib/private-match.ts'), 'utf8');
  assert.equal(/reasons\.push\([^)]*profile!?\.(age|hasCondition|medication)/.test(src), false);
  assert.equal(src.includes('localStorage'), false);
  assert.match(src, /Age range matches the public typed bounds/);
  assert.match(src, /Not a cryptographic proof|local-preview|PotentialMatch/);
});

test('private profile stays in memory in the designer store', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/state/cohort-store.ts'), 'utf8');
  assert.equal(src.includes('localStorage'), false);
  assert.equal(src.includes('sessionStorage'), false);
  assert.match(src, /setProfile/);
  assert.match(src, /PrivateProfile/);
});

test('trial cards distinguish potential match from verified eligibility', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/features/discovery/trials-view.tsx'), 'utf8');
  assert.match(src, /Potential match/);
  assert.match(src, /Verified eligibility/);
  assert.match(src, /Local preview only/);
  assert.match(src, /Trial data is temporarily unavailable/);
});

test('result copy does not claim a site received the referral', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/features/result/result-view.tsx'), 'utf8');
  assert.match(src, /Commitment created/);
  assert.match(src, /Not shared/);
  assert.equal(src.includes('Site received'), false);
  assert.match(src, /Your record stayed with you/);
  assert.match(src, /Eligibility verified/);
});

test('referral copy never claims a site received the qualification', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/features/referral/referral-view.tsx'), 'utf8');
  assert.equal(/site receives/i.test(src), false);
  assert.equal(src.includes('Site received'), false);
  assert.match(src, /Referral commitment created/);
  assert.match(src, /no live site inbox/);
});

test('profile view stays on-device and does not mention a server medical record', () => {
  const src = fs.readFileSync(path.join(root, 'web/src/features/profile/profile-view.tsx'), 'utf8');
  assert.match(src, /These facts stay on your device/);
  assert.match(src, /Find trials for me/);
  assert.equal(src.includes('fetch('), false);
  assert.equal(src.includes('localStorage'), false);
});
