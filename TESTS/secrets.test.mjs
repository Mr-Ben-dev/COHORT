import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LIVE_TOKEN = new RegExp(
  [
    'ghp_' + '[A-Za-z0-9]{16,}',
    'github_pat_' + '[A-Za-z0-9_]{16,}',
    'rnd_' + '[A-Za-z0-9]{16,}',
    'vcp_' + '[A-Za-z0-9]{16,}',
    'sk_live_' + '[A-Za-z0-9]{8,}',
    'BEGIN OPENSSH' + ' PRIVATE KEY',
  ].join('|'),
);

test('.env is gitignored', () => {
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gi, /^\.env$/m);
  assert.match(gi, /^\.env\.\*$/m);
  assert.match(gi, /^!\.env\.example$/m);
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.equal(LIVE_TOKEN.test(example), false);
});

test('tracked source contains no live token prefixes', () => {
  const walk = (dir, acc = []) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'managed'].includes(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, acc);
      else if (/\.(md|mjs|js|json|yml|yaml|html|css|example|gitignore)$/i.test(ent.name)) acc.push(p);
    }
    return acc;
  };
  for (const file of walk(root)) {
    if (file.endsWith(`${path.sep}.env`) || file.includes(`${path.sep}.env.`)) continue;
    const src = fs.readFileSync(file, 'utf8');
    assert.equal(LIVE_TOKEN.test(src), false, `${file} contains a live-looking token`);
  }
});

test('git history search when repo exists', () => {
  if (!fs.existsSync(path.join(root, '.git'))) {
    assert.ok(true);
    return;
  }
  const pattern =
    'ghp_' + '[A-Za-z0-9]{16,}' + '|' + 'github_pat_' + '[A-Za-z0-9_]{16,}' + '|' + 'rnd_' + '[A-Za-z0-9]{16,}' + '|' + 'vcp_' + '[A-Za-z0-9]{16,}';
  const out = execSync(`git grep -I -nE "${pattern}" || true`, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(out.trim(), '');
});
