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
  assert.match(md, /Apache License 2\.0/);
  assert.equal(fs.existsSync(path.join(root, 'LICENSE')), true);
  assert.equal(md.includes(CONTRACT_ADDRESS), true);
  assert.equal(md.includes(GOLD_PATH_TX.txHash), true);
  assert.equal(md.includes(COMPACT_COMPILER), true);
});

test('README mermaid node labels are GitHub-safe', () => {
  const md = read('README.md');
  const blocks = [...md.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length >= 6, `expected >=6 mermaid blocks, got ${blocks.length}`);
  for (const [i, block] of blocks.entries()) {
    assert.equal(/\w+\[[^"\n]*\(/.test(block), false, `block ${i} has unquoted parentheses in a node label`);
    assert.equal(/\[[^"\n]*'/.test(block), false, `block ${i} has an unquoted apostrophe in a node label`);
  }
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
