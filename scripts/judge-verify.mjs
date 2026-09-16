#!/usr/bin/env node
/**
 * Judge verification report. Never prints secrets, mnemonics, private keys,
 * health witnesses, database credentials, or API tokens.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContract } from './compile-contract.mjs';
import {
  PROJECT_NAME,
  NETWORK_ID,
  CONTRACT_ADDRESS,
  COMPACT_COMPILER,
  COMPACT_LANGUAGE,
  COMPACT_RUNTIME,
  ONCHAIN_RUNTIME,
  MIDNIGHT_JS,
  DAPP_CONNECTOR,
  WALLET_SDK,
  CIRCUIT_ID,
  SOURCE_CONTRACT,
  VERIFIER_SHA256,
  INDEXER_URL,
  API_ORIGIN,
  WEB_ORIGIN,
  REPO_URL,
  EXPLORER_URL,
  GOLD_PATH_TX,
  HISTORICAL_TXS,
} from './judge-pins.mjs';
import { PUBLIC_NETWORK_PINS } from '../packages/dapp/src/pins.mjs';
import { zkArtifactPaths } from '../packages/dapp/src/zk-fs.mjs';
import { PRIVATE_FIELD_NAMES } from '../apps/api/src/public-fields.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SECRET_KEY = /^(GITHUB_TOKEN|GH_TOKEN|RENDER_API_KEY|VERCEL_API_TOKEN|MIDNIGHT_.*SEED|.*PRIVATE_KEY|.*MNEMONIC|.*PASSWORD|DATABASE_URL)$/i;
const SECRET_VALUE = /(ghp_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|rnd_[A-Za-z0-9]{8,}|vcp_[A-Za-z0-9]{8,}|sk_live_|BEGIN OPENSSH)/;

function redact(value) {
  if (value == null) return value;
  const s = String(value);
  if (SECRET_VALUE.test(s)) return '[redacted]';
  return s;
}

function line(status, title, detail = '') {
  const extra = detail ? ` — ${detail}` : '';
  console.log(`[${status}] ${title}${extra}`);
}

function fail(title, detail) {
  line('FAIL', title, detail);
  return false;
}

function ok(status, title, detail) {
  line(status, title, detail);
  return true;
}

async function fetchJson(url, { method = 'GET', body, timeoutMs = 20_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text.slice(0, 200) };
    }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

function gitRev() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) return 'UNKNOWN';
  return (r.stdout || '').trim();
}

function lockVersions(name) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const found = new Set();
  for (const [loc, meta] of Object.entries(lock.packages || {})) {
    const last = loc.split('node_modules/').pop();
    if (last === name && meta?.version) found.add(meta.version);
  }
  return [...found];
}

function parseTestCounts(output) {
  const tests = Number((output.match(/# tests\s+(\d+)/) || [])[1] || NaN);
  const pass = Number((output.match(/# pass\s+(\d+)/) || [])[1] || NaN);
  const failCount = Number((output.match(/# fail\s+(\d+)/) || [])[1] || 0);
  const skipped = Number((output.match(/# skipped\s+(\d+)/) || [])[1] || 0);
  return { tests, pass, fail: failCount, skipped };
}

async function indexerLatest() {
  const query = `{ contractAction(address: "${CONTRACT_ADDRESS}") { __typename ... on ContractCall { entryPoint } address transaction { hash } } }`;
  return fetchJson(INDEXER_URL, { method: 'POST', body: { query } });
}

async function indexerLedger() {
  const { readPublicVerification, readDeployedVerifierKey } = await import(
    '../packages/dapp/src/public-state.mjs'
  );
  const verification = await Promise.race([
    readPublicVerification(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('indexer ledger timeout')), 45_000)),
  ]);
  const deployed = await Promise.race([
    readDeployedVerifierKey(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('indexer verifier timeout')), 45_000)),
  ]);
  return { verification, deployed };
}

function backendGateResult(res) {
  const dumped = JSON.stringify(res.json);
  const echoed = dumped.includes('31') || dumped.includes('"age":');
  return { status: res.status, echoed, fields: res.json?.fields };
}

const skipCompile = process.argv.includes('--skip-compile');
const skipTests = process.argv.includes('--skip-tests');

let failed = 0;
const note = (cond) => {
  if (!cond) failed += 1;
};

console.log('============================================================');
console.log(`${PROJECT_NAME} — judge verification`);
console.log('============================================================');
console.log(`Project:            ${PROJECT_NAME}`);
console.log(`Network:            ${NETWORK_ID} (ledger 8 public net)`);
console.log(`Contract:           ${CONTRACT_ADDRESS}`);
console.log(`Compact compiler:   ${COMPACT_COMPILER}`);
console.log(`Compact language:   ${COMPACT_LANGUAGE}`);
console.log(`compact-runtime:    ${COMPACT_RUNTIME}`);
console.log(`onchain-runtime:    ${ONCHAIN_RUNTIME}`);
console.log(`midnight-js:        ${MIDNIGHT_JS}`);
console.log(`DApp Connector:     ${DAPP_CONNECTOR}`);
console.log(`wallet-sdk:         ${WALLET_SDK}`);
console.log(`Git commit:         ${gitRev()}`);
console.log(`Repo:               ${REPO_URL}`);
console.log('Secret policy:      env keys matching token/seed/mnemonic patterns are never printed');
for (const key of Object.keys(process.env)) {
  if (SECRET_KEY.test(key)) {
    console.log(`  ${key}=[present, redacted]`);
  }
}
console.log('');

console.log('--- 1. Compact source / circuit inventory ---');
ok('COMMITTED EVIDENCE', 'source', SOURCE_CONTRACT);
ok('COMMITTED EVIDENCE', 'exported circuit', CIRCUIT_ID);
ok('COMMITTED EVIDENCE', 'ledger fields', 'spent (Set), referrals (Set), proven (Counter)');
ok('COMMITTED EVIDENCE', 'witnesses used', 'wAge, wCondition, wMedication, wSecret, wBlind');
ok('COMMITTED EVIDENCE', 'witness declared unused', 'wSex is declared in Compact and stripped from generated witnesses');
ok('COMMITTED EVIDENCE', 'public circuit args', 'trialId, minAge, maxAge, requireCondition, forbidMedication');
console.log('');

console.log('--- 2. Full Compact compile ---');
try {
  const compiled = await compileContract({ skipCompile });
  note(
    ok(
      skipCompile ? 'COMMITTED EVIDENCE' : 'LOCAL REPRODUCED',
      skipCompile ? 'compile skipped; committed artifacts verified' : 'full compact compile +0.31.1 (not --skip-zk)',
      `verifier ${compiled.committed.verifierSha.slice(0, 12)}…`,
    ),
  );
  ok('LOCAL REPRODUCED', 'generated artifacts', `prover ${compiled.committed.proverBytes} bytes, verifier ${compiled.committed.verifierBytes} bytes, zkir+bzkir present`);
  ok('COMMITTED EVIDENCE', 'compiler-info', `${compiled.committed.compilerVersion} / language ${compiled.committed.languageVersion} / runtime ${compiled.committed.runtimeVersion}`);
} catch (err) {
  note(fail('compact compile', redact(err.message)));
}
console.log('');

console.log('--- 3. Runtime / dependency tree ---');
try {
  const compactRt = JSON.parse(
    fs.readFileSync(path.join(root, 'node_modules/@midnight-ntwrk/compact-runtime/package.json'), 'utf8'),
  ).version;
  const onchain = JSON.parse(
    fs.readFileSync(path.join(root, 'node_modules/@midnight-ntwrk/onchain-runtime-v3/package.json'), 'utf8'),
  ).version;
  note(compactRt === PUBLIC_NETWORK_PINS.compactRuntime
    ? ok('LOCAL REPRODUCED', 'compact-runtime', compactRt)
    : fail('compact-runtime', compactRt));
  const onchainVers = lockVersions('@midnight-ntwrk/onchain-runtime-v3');
  note(onchainVers.length === 1 && onchainVers[0] === ONCHAIN_RUNTIME
    ? ok('LOCAL REPRODUCED', 'onchain-runtime-v3 unique tree', onchain)
    : fail('onchain-runtime-v3', onchainVers.join(',')));
  note(ok('COMMITTED EVIDENCE', 'midnight-js pin', MIDNIGHT_JS));
  note(ok('COMMITTED EVIDENCE', 'dapp-connector-api pin', DAPP_CONNECTOR));
  note(ok('COMMITTED EVIDENCE', 'wallet-sdk pin', WALLET_SDK));
} catch (err) {
  note(fail('dependency tree', redact(err.message)));
}
console.log('');

console.log('--- 4. Tests ---');
if (skipTests) {
  ok('UNKNOWN', 'npm test', 'skipped (--skip-tests); run npm test separately');
} else {
  const webNext = path.join(root, 'web', '.next');
  if (!fs.existsSync(webNext)) {
    note(fail('web/.next', 'Playwright privacy tests require: cd web && npm install && npm run build'));
  }
  const r = spawnSync('npm', ['test'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 180_000,
    env: process.env,
    shell: true,
  });
  const counts = parseTestCounts(`${r.stdout || ''}\n${r.stderr || ''}`);
  if (!Number.isFinite(counts.tests)) {
    note(fail('npm test', `could not parse counts; exit ${r.status}`));
  } else if (r.status === 0 && counts.fail === 0) {
    note(ok('LOCAL REPRODUCED', 'npm test', `tests ${counts.tests} / pass ${counts.pass} / fail ${counts.fail} / skipped ${counts.skipped}`));
  } else {
    note(fail('npm test', `tests ${counts.tests} / pass ${counts.pass} / fail ${counts.fail} / skipped ${counts.skipped}`));
  }
}
console.log('');

console.log('--- 5. Security / privacy ---');
ok('COMMITTED EVIDENCE', 'backend private-field allowlist', `${PRIVATE_FIELD_NAMES.length} rejected keys including age, secret, blind, profile`);
ok('COMMITTED EVIDENCE', 'no hosted proof-server', '1AM in-browser WASM; Lace proving is LIMITED');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
note(!SECRET_VALUE.test(envExample)
  ? ok('LOCAL REPRODUCED', '.env.example has no live tokens', '')
  : fail('.env.example', 'looks like a live token'));
console.log('');

console.log('--- 6. Backend privacy gate (live Render) ---');
try {
  const health = await fetchJson(`${API_ORIGIN}/health`);
  note(health.ok && health.json?.status === 'ok'
    ? ok('LIVE VERIFIED', 'GET /health', API_ORIGIN)
    : fail('GET /health', String(health.status)));
  const config = await fetchJson(`${API_ORIGIN}/api/config`);
  note(config.json?.contractAddress === CONTRACT_ADDRESS
    ? ok('LIVE VERIFIED', 'GET /api/config contract', CONTRACT_ADDRESS)
    : fail('GET /api/config', redact(JSON.stringify(config.json)?.slice(0, 120))));
  const hostile = await fetchJson(`${API_ORIGIN}/api/referral`, {
    method: 'POST',
    body: { trialId: 'NCT07153614', age: 31, profile: { age: 31 } },
  });
  const gate = backendGateResult(hostile);
  note(hostile.status === 400 && !gate.echoed
    ? ok('LIVE VERIFIED', 'POST /api/referral private fields HTTP 400, no echo', `fields=${(gate.fields || []).join(',')}`)
    : fail('privacy gate', `status ${hostile.status} echoed=${gate.echoed}`));
  const zk = await fetch(`${API_ORIGIN}/zk/keys/${CIRCUIT_ID}.verifier`);
  const zkBuf = Buffer.from(await zk.arrayBuffer());
  const zkSha = crypto.createHash('sha256').update(zkBuf).digest('hex');
  note(zkSha === VERIFIER_SHA256
    ? ok('LIVE VERIFIED', 'live /zk verifier SHA-256', zkSha)
    : fail('live /zk verifier', zkSha));
} catch (err) {
  note(fail('live Render', redact(err.message)));
}
console.log('');

console.log('--- 7. Indexer / Preprod evidence ---');
try {
  const latest = await indexerLatest();
  const action = latest.json?.data?.contractAction;
  if (action?.transaction?.hash) {
    note(ok('INDEXER VERIFIED', 'latest contractAction', `${action.entryPoint || action.__typename} hash=${action.transaction.hash}`));
    if (action.entryPoint && action.entryPoint !== CIRCUIT_ID) {
      note(fail('latest entryPoint', action.entryPoint));
    }
  } else {
    note(fail('indexer contractAction', redact(JSON.stringify(latest.json).slice(0, 180))));
  }
  const { verification, deployed } = await indexerLedger();
  note(ok('INDEXER VERIFIED', 'queryContractState + ledger()', `proven=${verification.proven} spent=${verification.spentCount} referrals=${verification.referralCount}`));
  const localVerifier = fs.readFileSync(zkArtifactPaths().verifier);
  const onchain = Buffer.from(deployed.verifierKey);
  note(onchain.equals(localVerifier)
    ? ok('INDEXER VERIFIED', 'on-chain verifier equals committed keys', VERIFIER_SHA256)
    : fail('on-chain verifier mismatch', ''));
  if (verification.proven < 2) {
    note(fail('proven counter', `expected >= 2, got ${verification.proven}`));
  }
} catch (err) {
  note(fail('indexer', redact(err.message)));
}
console.log('');

console.log('--- 8. Recorded transactions ---');
ok('COMMITTED EVIDENCE', GOLD_PATH_TX.what, `txHash=${GOLD_PATH_TX.txHash} txId=${GOLD_PATH_TX.txId} then proven=${GOLD_PATH_TX.provenAfter}`);
for (const tx of HISTORICAL_TXS) {
  ok(tx.status, tx.what, `txHash=${tx.txHash}${tx.block ? ` block=${tx.block}` : ''} then proven=${tx.provenAfter}`);
}
ok('COMMITTED EVIDENCE', 'Node SDK prove', 'historical only — not the browser gold path; identifier omitted here on purpose');
ok('PLANNED', 'Wave 2 site verification console / challenge-bound circuit / issuer signatures', 'not shipped');
ok('PLANNED', 'Wave 3 Mainnet address / production monitoring / escrow', 'not shipped');
console.log('');

console.log('--- 9. Deployment endpoints ---');
ok('COMMITTED EVIDENCE', 'designer UI', WEB_ORIGIN);
ok('COMMITTED EVIDENCE', 'API health', `${API_ORIGIN}/health`);
ok('COMMITTED EVIDENCE', 'public-state cache (not indexer truth)', `${API_ORIGIN}/api/public-state`);
ok('COMMITTED EVIDENCE', 'indexer', INDEXER_URL);
ok('COMMITTED EVIDENCE', 'explorer', EXPLORER_URL);
console.log('');

console.log('============================================================');
if (failed === 0) {
  console.log('RESULT: PASS — local compile/artifacts, tests (unless skipped), and Preprod evidence agreed.');
} else {
  console.log(`RESULT: FAIL — ${failed} check(s) failed.`);
}
console.log('Labels: LOCAL REPRODUCED | INDEXER VERIFIED | COMMITTED EVIDENCE | PLANNED | LIVE VERIFIED');
console.log('============================================================');
process.exit(failed === 0 ? 0 : 1);
