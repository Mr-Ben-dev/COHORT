import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';
import { zkArtifactPaths, zkArtifactsPresent } from '../packages/dapp/src/zk-fs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('public circuit keys are present and are not wallet secrets', () => {
  assert.equal(zkArtifactsPresent(), true);
  const p = zkArtifactPaths();
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gi, /!packages\/contract\/zk\/\*\*\/\*\.prover/);
  for (const file of [p.prover, p.verifier, p.bzkir]) {
    assert.equal(fs.existsSync(file), true, file);
    const name = path.basename(file).toLowerCase();
    assert.equal(name.includes('seed'), false);
    assert.equal(name.includes('mnemonic'), false);
  }
  const info = JSON.parse(fs.readFileSync(p.compilerInfo, 'utf8'));
  assert.equal(info['compiler-version'], '0.31.1');
  assert.equal(info.circuits[0].name, 'proveEligible');
});

test('GET /zk artifacts use octet-stream and never text/html', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const verifier = await request(url, '/zk/keys/proveEligible.verifier');
  assert.equal(verifier.status, 200);
  assert.match(verifier.headers['content-type'] || '', /octet-stream|application\/octet-stream/);
  assert.equal((verifier.headers['content-type'] || '').includes('text/html'), false);
  assert.ok(verifier.text.length > 32);

  const missing = await request(url, '/zk/keys/does-not-exist.verifier');
  assert.equal(missing.status, 404);
  assert.match(missing.headers['content-type'] || '', /application\/json/);
  assert.equal((missing.headers['content-type'] || '').includes('text/html'), false);

  const traverse = await request(url, '/zk/../.env');
  assert.ok([403, 404].includes(traverse.status));
  assert.equal((traverse.text || '').includes('GITHUB_TOKEN'), false);

  const cors = await request(url, '/zk/keys/proveEligible.verifier', {
    headers: { origin: 'chrome-extension://bphnkdkcnfhompoegfpgnkidcjfbojjp' },
  });
  assert.equal(cors.status, 200);
  assert.equal(cors.headers['access-control-allow-origin'], '*');
  assert.equal(cors.headers['cross-origin-resource-policy'], 'cross-origin');
});
