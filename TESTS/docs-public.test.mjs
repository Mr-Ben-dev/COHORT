import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORBIDDEN_PUBLIC_DOC_NAMES, CONTRACT_ADDRESS, COMPACT_COMPILER, GOLD_PATH_TX } from '../scripts/judge-pins.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('README contains judge compile/test commands and real evidence', () => {
  const md = read('README.md');
  assert.match(md, /npm run judge:verify/);
  assert.match(md, /npm run compile/);
  assert.match(md, new RegExp(`compact compile \\+${COMPACT_COMPILER}`));
  assert.match(md, /Do not use `--skip-zk`/);
  assert.equal(md.includes(CONTRACT_ADDRESS), true);
  assert.equal(md.includes(GOLD_PATH_TX.txHash), true);
  assert.equal(md.includes(COMPACT_COMPILER), true);
});

test('public docs do not name competitors', () => {
  const files = ['README.md'];
  if (fs.existsSync(path.join(root, 'about.md'))) files.push('about.md');
  if (fs.existsSync(path.join(root, 'ABOUT.md'))) files.push('ABOUT.md');
  for (const rel of files) {
    const md = read(rel);
    for (const name of FORBIDDEN_PUBLIC_DOC_NAMES) {
      assert.equal(md.includes(name), false, `${rel} contains ${name}`);
    }
    assert.match(md, /COHORT/);
  }
});
