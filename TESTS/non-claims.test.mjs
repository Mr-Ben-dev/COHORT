import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = 'docs/honest-non-claims.md';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// Key phrases pinned to each non-claim so the doc cannot silently drop one.
const KEY_PHRASES = [
  'not HIPAA-compliant',
  'not a hospital',
  'DEMO issuer',
  'self-asserted',
  'UNDEPLOYED',
  'not-deployed',
  'trust boundary',
  'non-proof public data',
  'Synthetic data only',
];

test('honest non-claims doc exists', () => {
  assert.equal(fs.existsSync(path.join(root, DOC)), true, `${DOC} missing`);
});

test('honest non-claims doc contains every key phrase', () => {
  const md = read(DOC);
  for (const phrase of KEY_PHRASES) {
    assert.ok(md.includes(phrase), `${DOC} dropped key phrase: "${phrase}"`);
  }
});

test('honest non-claims doc names the demo issuer ceremony script', () => {
  const md = read(DOC);
  assert.match(md, /scripts\/issuer-ceremony\.mjs/);
});

test('honest non-claims doc references the wallet trust doc', () => {
  const md = read(DOC);
  assert.match(md, /docs\/wallet-trust\.md/);
  assert.equal(fs.existsSync(path.join(root, 'docs/wallet-trust.md')), true);
});

// Banned phrases (case-insensitive): if any appear in public-facing docs,
// the test FAILS. Scans README.md and every docs/*.md.
const BANNED = [
  'hipaa compliant',
  'hospital partner',
  'certified',
  'guaranteed eligible',
];

function scannedDocs() {
  const files = ['README.md'];
  for (const f of fs.readdirSync(path.join(root, 'docs'))) {
    if (f.endsWith('.md')) files.push(`docs/${f}`);
  }
  return files;
}

test('README/docs never contain banned phrases', () => {
  for (const rel of scannedDocs()) {
    const md = read(rel).toLowerCase();
    for (const banned of BANNED) {
      assert.equal(
        md.includes(banned),
        false,
        `${rel} contains banned phrase "${banned}"`
      );
    }
  }
});

test('non-claims doc does not contradict itself with banned phrases', () => {
  const md = read(DOC).toLowerCase();
  // The doc may mention HIPAA-compliant only inside a negation.
  for (const banned of BANNED) {
    const occurrences = [...md.matchAll(new RegExp(banned.replace(/ /g, '\\s+'), 'gi'))];
    for (const m of occurrences) {
      const context = md.slice(Math.max(0, m.index - 60), m.index);
      assert.ok(
        /not\b/.test(context),
        `${DOC} uses banned phrase "${banned}" without a negation`
      );
    }
  }
});
