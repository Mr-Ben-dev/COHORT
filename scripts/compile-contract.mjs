#!/usr/bin/env node
/**
 * Full Compact compile for CONTRACT/cohort.compact.
 * Never uses --skip-zk. Pins compiler 0.31.1 for public-network ledger 8.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPACT_COMPILER,
  COMPACT_LANGUAGE,
  COMPACT_RUNTIME,
  CIRCUIT_ID,
  SOURCE_CONTRACT,
  VERIFIER_SHA256,
  PROVER_SHA256,
  PROVER_MIN_BYTES,
} from './judge-pins.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, SOURCE_CONTRACT);
const outDir = path.join(root, 'packages', 'contract', '.compile-out');
const committedZk = path.join(root, 'packages', 'contract', 'zk');

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function toWslPath(winPath) {
  const resolved = path.resolve(winPath).replace(/\\/g, '/');
  const m = resolved.match(/^([A-Za-z]):(.*)$/);
  if (!m) return resolved;
  return `/mnt/${m[1].toLowerCase()}${m[2]}`;
}

function looksLikeWindowsCompactTrap(bin) {
  if (!bin) return false;
  const n = bin.replace(/\//g, '\\').toLowerCase();
  return n.endsWith('\\compact.exe') && (n.includes('\\system32\\') || n.includes('\\windows\\'));
}

function run(command, args, opts = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    cwd: opts.cwd || root,
    env: opts.env || process.env,
    timeout: opts.timeout ?? 10 * 60 * 1000,
    windowsHide: true,
  });
}

function compactVersionViaWsl() {
  const script = [
    'export PATH="$HOME/.local/bin:$HOME/.compact/bin:$PATH"',
    `compact compile +${COMPACT_COMPILER} --version`,
  ].join('; ');
  const r = run('wsl', ['-e', 'bash', '-lc', script]);
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || r.stdout || r.error?.message || 'wsl compact failed').trim() };
  }
  return { ok: true, version: (r.stdout || '').trim().split(/\r?\n/).pop() };
}

function resolveCompact() {
  if (process.env.COMPACT_BIN) {
    return { mode: 'native', bin: process.env.COMPACT_BIN };
  }
  if (process.platform === 'win32') {
    const where = run('where.exe', ['compact']);
    const first = (where.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (first && !looksLikeWindowsCompactTrap(first)) {
      return { mode: 'native', bin: first };
    }
    const wsl = compactVersionViaWsl();
    if (wsl.ok) return { mode: 'wsl', bin: 'wsl' };
    throw new Error(
      [
        'Compact 0.31.1 was not found.',
        'Windows does not ship a native Midnight Compact compiler (system32 compact.exe is NTFS compression — do not use it).',
        'Install Compact inside WSL:',
        '  curl --proto "=https" --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh',
        '  source ~/.bashrc',
        `  compact update ${COMPACT_COMPILER}`,
        `  compact compile +${COMPACT_COMPILER} --version`,
        wsl.error ? `WSL probe: ${wsl.error}` : '',
      ].filter(Boolean).join('\n'),
    );
  }
  const which = run('bash', ['-lc', 'command -v compact']);
  const bin = (which.stdout || '').trim();
  if (!bin) {
    throw new Error(
      [
        'compact was not found on PATH.',
        'Install: curl --proto "=https" --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh',
        `Then: compact update ${COMPACT_COMPILER} && compact compile +${COMPACT_COMPILER} --version`,
      ].join('\n'),
    );
  }
  return { mode: 'native', bin };
}

function assertCompilerVersion(resolved) {
  let version = '';
  if (resolved.mode === 'wsl') {
    const wsl = compactVersionViaWsl();
    if (!wsl.ok) throw new Error(wsl.error);
    version = wsl.version;
  } else {
    const r = run(resolved.bin, ['compile', `+${COMPACT_COMPILER}`, '--version']);
    if (r.status !== 0) {
      throw new Error((r.stderr || r.stdout || `failed to run ${resolved.bin} compile --version`).trim());
    }
    version = (r.stdout || '').trim().split(/\r?\n/).pop();
  }
  if (version !== COMPACT_COMPILER) {
    throw new Error(`Expected compact compile +${COMPACT_COMPILER} --version => ${COMPACT_COMPILER}, got ${version}`);
  }
  return version;
}

function compile(resolved) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const args = ['compile', `+${COMPACT_COMPILER}`, SOURCE_CONTRACT, 'packages/contract/.compile-out'];
  if (args.includes('--skip-zk')) {
    throw new Error('internal error: skip-zk is forbidden');
  }
  let r;
  if (resolved.mode === 'wsl') {
    const wslRoot = toWslPath(root);
    const cmd = [
      'export PATH="$HOME/.local/bin:$HOME/.compact/bin:$HOME/.compact/versions/' + COMPACT_COMPILER + '/x86_64-unknown-linux-musl:$PATH"',
      `cd ${JSON.stringify(wslRoot)}`,
      `compact compile +${COMPACT_COMPILER} ${SOURCE_CONTRACT} packages/contract/.compile-out`,
    ].join('; ');
    r = run('wsl', ['-e', 'bash', '-lc', cmd]);
  } else {
    r = run(resolved.bin, args, {
      env: {
        ...process.env,
        PATH: `${process.env.HOME || os.homedir()}/.local/bin:${process.env.HOME || os.homedir()}/.compact/bin:${process.env.PATH || ''}`,
      },
    });
  }
  const log = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0) {
    throw new Error(`compact compile failed (exit ${r.status}):\n${log}`);
  }
  if (/\b--skip-zk\b/.test(log)) {
    throw new Error('compile log mentions --skip-zk; full ZK compile is required');
  }
  return log.trim();
}

function artifactPaths(base, { includeContractJs = false } = {}) {
  const paths = {
    verifier: path.join(base, 'keys', `${CIRCUIT_ID}.verifier`),
    prover: path.join(base, 'keys', `${CIRCUIT_ID}.prover`),
    zkir: path.join(base, 'zkir', `${CIRCUIT_ID}.zkir`),
    bzkir: path.join(base, 'zkir', `${CIRCUIT_ID}.bzkir`),
    info: path.join(base, 'compiler', 'contract-info.json'),
  };
  if (includeContractJs) {
    paths.contractJs = path.join(base, 'contract', 'index.js');
  }
  return paths;
}

export function verifyArtifactSet(base, label, { includeContractJs = false } = {}) {
  const p = artifactPaths(base, { includeContractJs });
  for (const [name, file] of Object.entries(p)) {
    if (!fs.existsSync(file)) throw new Error(`${label} missing ${name}: ${file}`);
  }
  const proverSize = fs.statSync(p.prover).size;
  if (proverSize < PROVER_MIN_BYTES) {
    throw new Error(`${label} prover is ${proverSize} bytes; expected > ${PROVER_MIN_BYTES} (full ZK, not skip-zk)`);
  }
  const info = JSON.parse(fs.readFileSync(p.info, 'utf8'));
  if (info['compiler-version'] !== COMPACT_COMPILER) {
    throw new Error(`${label} compiler-version ${info['compiler-version']} != ${COMPACT_COMPILER}`);
  }
  if (info['language-version'] !== COMPACT_LANGUAGE) {
    throw new Error(`${label} language-version ${info['language-version']} != ${COMPACT_LANGUAGE}`);
  }
  if (info['runtime-version'] !== COMPACT_RUNTIME) {
    throw new Error(`${label} runtime-version ${info['runtime-version']} != ${COMPACT_RUNTIME}`);
  }
  if (info.circuits?.[0]?.name !== CIRCUIT_ID) {
    throw new Error(`${label} circuit is ${info.circuits?.[0]?.name}, expected ${CIRCUIT_ID}`);
  }
  const verifierSha = sha256File(p.verifier);
  const proverSha = sha256File(p.prover);
  if (verifierSha !== VERIFIER_SHA256) {
    throw new Error(`${label} verifier SHA-256 ${verifierSha} != pinned ${VERIFIER_SHA256}`);
  }
  if (proverSha !== PROVER_SHA256) {
    throw new Error(`${label} prover SHA-256 ${proverSha} != pinned ${PROVER_SHA256}`);
  }
  const verifierHead = fs.readFileSync(p.verifier).subarray(0, 26).toString('utf8');
  if (verifierHead !== 'midnight:verifier-key[v6]:') {
    throw new Error(`${label} verifier prefix is ${JSON.stringify(verifierHead)}`);
  }
  return {
    compilerVersion: info['compiler-version'],
    languageVersion: info['language-version'],
    runtimeVersion: info['runtime-version'],
    circuit: CIRCUIT_ID,
    proverBytes: proverSize,
    verifierBytes: fs.statSync(p.verifier).size,
    verifierSha,
    proverSha,
    witnesses: (info.witnesses || []).map((w) => w.name),
    ledger: (info.ledger || []).map((f) => f.name),
  };
}

export async function compileContract({ skipCompile = false } = {}) {
  if (!fs.existsSync(source)) throw new Error(`missing ${SOURCE_CONTRACT}`);
  const committed = verifyArtifactSet(committedZk, 'committed packages/contract/zk');
  let compileLog = null;
  let compilerReported = null;
  let mode = 'committed-only';
  if (!skipCompile) {
    const resolved = resolveCompact();
    compilerReported = assertCompilerVersion(resolved);
    compileLog = compile(resolved);
    const fresh = verifyArtifactSet(outDir, 'fresh compile-out', { includeContractJs: true });
    if (fresh.verifierSha !== committed.verifierSha) {
      throw new Error('fresh verifier does not match committed keys — refusing to treat this as the Preprod contract');
    }
    mode = resolved.mode;
  }
  return {
    mode,
    compilerReported,
    compileLog,
    committed,
    outDir: skipCompile ? null : outDir,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const skipCompile = process.argv.includes('--skip-compile');
  try {
    const result = await compileContract({ skipCompile });
    console.log(`COHORT Compact compile ${skipCompile ? 'CHECK' : 'FULL ZK'} — compiler ${COMPACT_COMPILER}`);
    console.log(`source: ${SOURCE_CONTRACT}`);
    console.log(`circuit: ${CIRCUIT_ID}`);
    if (result.compilerReported) console.log(`compact compile +${COMPACT_COMPILER} --version: ${result.compilerReported}`);
    if (result.compileLog) console.log(result.compileLog);
    console.log(`verifier SHA-256: ${result.committed.verifierSha}`);
    console.log(`prover SHA-256:   ${result.committed.proverSha}`);
    console.log(`prover bytes:     ${result.committed.proverBytes}`);
    console.log(`witnesses:        ${result.committed.witnesses.join(', ')}`);
    console.log(`ledger:           ${result.committed.ledger.join(', ')}`);
    console.log('STATUS: REPRODUCED LOCALLY (artifacts match committed Preprod verifier)');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
