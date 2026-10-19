#!/usr/bin/env node
// MUST be first: patches globalThis.WebSocket to tunnel WSS through the
// egress proxy (ported from REMIT's operator-wallet.ts). The wallet SDK's
// graphql-ws uses the global WebSocket, which otherwise ignores HTTPS_PROXY.
import './ws-proxy-patch.mjs';

/**
 * SQUAD F — COHORT Preprod deployer.
 *
 * COHORT: "Prove you qualify for a clinical trial without handing over your
 * medical record." Compact 0.31.1 / language 0.23, ledger 8, midnight-js >= 4.0.2.
 *
 * Two modes:
 *
 *   node scripts/deployer.mjs --check
 *     READ-ONLY. Derives the Night + Dust addresses from MIDNIGHT_PREPROD_SEED
 *     (official HD path, docs.midnight.network/sdks/official/wallet-developer-guide),
 *     compares them with the configured MIDNIGHT_PREPROD_* addresses, then queries
 *     the Blockfrost Preprod indexer GraphQL DIRECTLY (no wallet sync):
 *       dustGenerationStatus(cardanoRewardAddresses:) -> registered, dustAddress,
 *         currentCapacity/maxCapacity (SPECK), generationRate (SPECK/s),
 *         nightBalance (STAR)
 *       block { height } -> indexer sync status
 *     plus a liveness probe of MIDNIGHT_PROOF_SERVER. Prints ONE JSON object to
 *     stdout and exits 0. On failure prints { ok:false, error } with the exact
 *     error and exits 1. Numbers are never invented.
 *
 *   node scripts/deployer.mjs --deploy
 *     CHAIN WRITE. Re-runs the funding gate, then deploys the compiled contract
 *     (CONTRACT/cohort.compact build output) to Preprod via midnight-js-contracts'
 *     deployContract, truth-gates by reading the contract back from the indexer
 *     (contractAction state decoded with the generated ledger()), and prints the
 *     tx hash + contract address. DO NOT RUN without explicit confirmation.
 *
 * SECRET HANDLING (non-negotiable):
 *   - MIDNIGHT_PREPROD_SEED is read from ~/workspace/cohort-wave2/.env
 *     (COHORT_WAVE2_ENV override) into process memory only.
 *   - It is NEVER printed, logged, committed, or sent to any browser/API.
 *   - All error strings pass through redact() before they reach stdout/stderr.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_WAVE2_ENV = path.join(os.homedir(), 'workspace', 'cohort-wave2', '.env');
const NETWORK_ID = 'preprod';
const BLOCKFROST_INDEXER_HTTP = 'https://midnight-preprod.blockfrost.io/api/v0';
const BLOCKFROST_INDEXER_WS = 'wss://midnight-preprod.blockfrost.io/api/v0/ws';
const BLOCKFROST_RPC_WS = 'wss://rpc.midnight-preprod.blockfrost.io';

// Ledger constants (docs.midnight.network/concepts/dust-architecture):
//   1 NIGHT = 1_000_000 STAR ; 1 DUST = 1_000_000_000_000_000 SPECK
const STARS_PER_NIGHT = 1_000_000n;
const SPECKS_PER_DUST = 1_000_000_000_000_000n;

/* ------------------------------------------------------------------ env */

function loadEnv() {
  const envPath = process.env.COHORT_WAVE2_ENV || DEFAULT_WAVE2_ENV;
  let text;
  try {
    text = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    throw new Error(`cannot read env file ${envPath}: ${err.message}`);
  }
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trimStart().startsWith('#')) env[m[1]] = m[2];
  }
  for (const k of [
    'MIDNIGHT_PREPROD_SEED',
    'BLOCKFROST_PROJECT_ID',
    'MIDNIGHT_PREPROD_DUST',
    'MIDNIGHT_PREPROD_UNSHIELDED',
    'MIDNIGHT_PREPROD_CARDANO',
    'MIDNIGHT_PROOF_SERVER',
  ]) {
    if (!env[k]) throw new Error(`env file is missing required key ${k}`);
  }
  return env;
}

function secretsOf(env) {
  return [env.MIDNIGHT_PREPROD_SEED, env.BLOCKFROST_PROJECT_ID].filter(Boolean);
}

/** Scrub every known secret out of a string before it touches stdout/stderr. */
function redact(text, secrets) {
  let out = String(text ?? '');
  for (const s of secrets) {
    if (s && s.length >= 8) out = out.split(s).join('[redacted]');
  }
  return out;
}

function withProjectId(url, projectId) {
  const u = new URL(url);
  u.searchParams.set('project_id', projectId);
  return u.toString();
}

/* ------------------------------------------------- key derivation (seed) */

/**
 * Official HD derivation (docs.midnight.network/sdks/official/wallet-developer-guide):
 *   m / 44' / 2400' / account' / role / index, account 0, index 0
 *   Roles.NightExternal -> unshielded keystore -> bech32m address
 *   Roles.Dust          -> DustSecretKey.fromSeed -> bech32m dust address
 *   Roles.Zswap         -> ZswapSecretKeys.fromSeed (kept for --deploy)
 * Verified against the configured MIDNIGHT_PREPROD_* addresses at runtime.
 */
async function deriveFromSeed(mnemonic) {
  const { mnemonicToSeedSync, validateMnemonic } = await import('@scure/bip39');
  const { wordlist } = await import('@scure/bip39/wordlists/english.js');
  const words = String(mnemonic).trim().split(/\s+/);
  if (words.length !== 24) throw new Error(`seed must be a 24-word mnemonic (got ${words.length} words)`);
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error('seed mnemonic failed BIP-39 validation');
  const seed = mnemonicToSeedSync(mnemonic);

  const { HDWallet, Roles } = await import('@midnight-ntwrk/wallet-sdk-hd');
  const r = HDWallet.fromSeed(seed);
  if (r.type !== 'seedOk') throw new Error('HDWallet.fromSeed rejected the seed');
  const hd = r.hdWallet;
  const account = hd.selectAccount(0);
  const deriveRoleKey = (role) => {
    for (let index = 0; index < 8; index++) {
      const res = account.selectRole(role).deriveKeyAt(index);
      if (res.type === 'keyDerived') return Buffer.from(res.key);
    }
    throw new Error('HD role-key derivation failed 8 times in a row');
  };
  const unshieldedKey = deriveRoleKey(Roles.NightExternal);
  const dustSeed = deriveRoleKey(Roles.Dust);
  const shieldedSeed = deriveRoleKey(Roles.Zswap);
  hd.clear();
  seed.fill(0);

  const ledger = await import('@midnight-ntwrk/ledger-v8');
  const { DustAddress } = await import('@midnight-ntwrk/wallet-sdk-address-format');
  const { createKeystore, PublicKey } = await import('@midnight-ntwrk/wallet-sdk-unshielded-wallet');

  const dustSecretKey = ledger.DustSecretKey.fromSeed(dustSeed);
  const dustAddress = DustAddress.encodePublicKey(NETWORK_ID, dustSecretKey.publicKey);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(shieldedSeed);
  const unshieldedKeystore = createKeystore(unshieldedKey, NETWORK_ID);
  const nightAddress = PublicKey.fromKeyStore(unshieldedKeystore).address;

  return { dustAddress, nightAddress, dustSecretKey, shieldedSecretKeys, unshieldedKeystore };
}

/* --------------------------------------- Cardano base -> reward address */

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}

function bech32HrpExpand(hrp) {
  const out = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

function bech32Decode(addr) {
  const s = addr.toLowerCase();
  const pos = s.lastIndexOf('1');
  if (pos < 1 || pos + 7 > s.length) throw new Error('invalid bech32 address');
  const hrp = s.slice(0, pos);
  const data = [];
  for (const c of s.slice(pos + 1)) {
    const d = BECH32_CHARSET.indexOf(c);
    if (d === -1) throw new Error('invalid bech32 character');
    data.push(d);
  }
  if (bech32Polymod([...bech32HrpExpand(hrp), ...data]) !== 1) throw new Error('bech32 checksum failed');
  // convert 5-bit groups -> 8-bit bytes
  const bytes = [];
  let acc = 0, bits = 0;
  for (const v of data.slice(0, -6)) {
    acc = (acc << 5) | v;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return { hrp, bytes: Buffer.from(bytes) };
}

function bech32Encode(hrp, bytes) {
  const data = [];
  let acc = 0, bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      data.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) data.push((acc << (5 - bits)) & 31);
  const pm = bech32Polymod([...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = [];
  for (let i = 0; i < 6; i++) checksum.push((pm >> (5 * (5 - i))) & 31);
  return hrp + '1' + [...data, ...checksum].map((d) => BECH32_CHARSET[d]).join('');
}

/**
 * Derive the Cardano REWARD address (stake_test...) from a base payment
 * address (addr_test...). Per CIP-19 the header byte is (type << 4) | network:
 * testnet network id is 0, so a testnet keyhash-base address starts 0x00
 * (type 0 = base, payment keyhash + stake keyhash) and is 57 bytes:
 *   header 0x00 | 28-byte payment hash | 28-byte stake hash.
 * The reward address is (0xE0 | network) | stake hash, bech32 'stake_test'.
 */
function cardanoRewardAddress(baseAddr) {
  const { bytes } = bech32Decode(baseAddr);
  if (bytes.length !== 57) {
    throw new Error(`cardano address is ${bytes.length} bytes, not a 57-byte base address; cannot derive reward address`);
  }
  const header = bytes[0];
  const type = header >> 4;
  const network = header & 0x0f;
  if (type !== 0 && type !== 1) {
    throw new Error(`cardano address type ${type} carries no 28-byte stake key hash`);
  }
  const stakeHash = bytes.slice(29, 57);
  return bech32Encode('stake_test', Buffer.concat([Buffer.from([0xe0 | network]), stakeHash]));
}

/* ---------------------------------------------------------------- GraphQL */

async function gqlPost(url, query, variables, { timeoutMs = 30000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: ctl.signal,
    });
  } catch (err) {
    throw new Error(`indexer unreachable: ${err.message}`);
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) throw new Error(`indexer HTTP ${res.status}`);
  const json = await res.json();
  if (Array.isArray(json.errors) && json.errors.length) {
    throw new Error(`indexer GraphQL error: ${json.errors[0]?.message || 'unknown'}`);
  }
  return json.data;
}

/* ------------------------------------------------------------------ --check */

function fmtUnits(raw, perWhole, unit) {
  const v = BigInt(raw);
  const whole = v / perWhole;
  const frac = v % perWhole;
  const fracStr = frac.toString().padStart(perWhole.toString().length - 1, '0').replace(/0+$/, '');
  return `${whole.toString()}${fracStr ? '.' + fracStr : ''} ${unit}`;
}

async function runCheck() {
  const env = loadEnv();
  const secrets = secretsOf(env);
  const fail = (message) => {
    process.stdout.write(JSON.stringify({ ok: false, mode: 'check', error: redact(message, secrets) }, null, 2) + '\n');
    process.exit(1);
  };

  let derived;
  try {
    derived = await deriveFromSeed(env.MIDNIGHT_PREPROD_SEED);
  } catch (err) {
    fail(`key derivation failed: ${err.message}`);
  }

  const dustConfigured = env.MIDNIGHT_PREPROD_DUST;
  const nightConfigured = env.MIDNIGHT_PREPROD_UNSHIELDED;
  const dustMatch = derived.dustAddress === dustConfigured;
  const nightMatch = derived.nightAddress === nightConfigured;

  let rewardAddress = null;
  let rewardErr = null;
  try {
    rewardAddress = cardanoRewardAddress(env.MIDNIGHT_PREPROD_CARDANO);
  } catch (err) {
    rewardErr = err.message;
  }

  const indexerHttp = withProjectId(BLOCKFROST_INDEXER_HTTP, env.BLOCKFROST_PROJECT_ID);

  // 1. DUST generation status for the deployer's reward address.
  let dustGen = null;
  let dustGenError = null;
  if (rewardAddress) {
    try {
      const data = await gqlPost(
        indexerHttp,
        `query DustGen($addrs: [CardanoRewardAddress!]!) {
          dustGenerationStatus(cardanoRewardAddresses: $addrs) {
            cardanoRewardAddress registered dustAddress
            currentCapacity maxCapacity generationRate nightBalance
          }
        }`,
        { addrs: [rewardAddress] },
      );
      const rows = data?.dustGenerationStatus ?? [];
      dustGen = rows.length ? rows[0] : { registered: false };
    } catch (err) {
      dustGenError = err.message;
    }
  }

  // 2. Indexer sync status: latest block height.
  let indexerHeight = null;
  let indexerError = null;
  try {
    const data = await gqlPost(indexerHttp, `query { block { height timestamp } }`, {});
    indexerHeight = data?.block?.height ?? null;
  } catch (err) {
    indexerError = err.message;
  }

  // 3. Proof-server liveness probe (no seed involved).
  let proofAlive = false;
  let proofDetail = null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    try {
      const res = await fetch(env.MIDNIGHT_PROOF_SERVER, { signal: ctl.signal });
      proofAlive = true;
      proofDetail = `HTTP ${res.status}`;
    } finally {
      clearTimeout(t);
    }
  } catch (err) {
    proofDetail = err.message;
  }

  const row = dustGen && dustGen.registered ? dustGen : null;
  const capSpecks = row ? BigInt(row.maxCapacity) : null;
  const curSpecks = row ? BigInt(row.currentCapacity) : null;
  const nightStars = row ? BigInt(row.nightBalance) : null;

  let verdict = 'NO-GO';
  let reason;
  if (dustGenError) {
    reason = `dustGenerationStatus query failed: ${dustGenError}`;
  } else if (rewardErr) {
    reason = `reward address derivation failed: ${rewardErr}`;
  } else if (!row) {
    reason = 'reward address is not registered for DUST generation (faucet/registration step missing)';
  } else if (row.dustAddress && row.dustAddress !== derived.dustAddress) {
    reason = `registered dust address ${row.dustAddress} does not match seed-derived ${derived.dustAddress}`;
  } else if (curSpecks === 0n) {
    reason = 'DUST capacity is zero — fund via the tDUST faucet and wait for generation';
  } else if (!dustMatch) {
    reason = 'seed-derived DUST address does not match MIDNIGHT_PREPROD_DUST in .env';
  } else {
    verdict = 'GO';
    reason = 'dust address registered, capacity available, derivation matches .env';
  }

  const out = {
    ok: true,
    mode: 'check',
    network: 'preprod',
    seedWords: 24,
    addresses: {
      dust: { derived: derived.dustAddress, configured: dustConfigured, match: dustMatch },
      night: { derived: derived.nightAddress, configured: nightConfigured, match: nightMatch },
    },
    cardano: {
      base: env.MIDNIGHT_PREPROD_CARDANO,
      reward: rewardAddress,
      rewardError: rewardErr,
    },
    dustGeneration: row
      ? {
          registered: true,
          dustAddress: row.dustAddress,
          currentCapacitySpecks: row.currentCapacity,
          maxCapacitySpecks: row.maxCapacity,
          currentDust: fmtUnits(row.currentCapacity, SPECKS_PER_DUST, 'DUST'),
          maxDust: fmtUnits(row.maxCapacity, SPECKS_PER_DUST, 'DUST'),
          generationRateSpecksPerSec: row.generationRate,
          nightBackingStars: row.nightBalance,
          nightBacking: fmtUnits(row.nightBalance, STARS_PER_NIGHT, 'NIGHT'),
        }
      : { registered: false, error: dustGenError },
    indexer: {
      host: 'midnight-preprod.blockfrost.io',
      height: indexerHeight,
      error: indexerError,
    },
    proofServer: { url: env.MIDNIGHT_PROOF_SERVER, alive: proofAlive, detail: proofDetail },
    fundingGate: {
      verdict,
      reason: redact(reason, secrets),
      deployAllowed: verdict === 'GO',
    },
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  return out;
}

/* ------------------------------------------------- generated contract load */

/**
 * Resolve the LATEST compiled contract at runtime: .compile-out first
 * (the B2 recompile target), then the managed fallback. Rejects stale copies
 * that lack the attestation circuits.
 */
async function loadGeneratedContract() {
  const candidates = [
    path.join(ROOT, 'packages', 'contract', '.compile-out', 'contract', 'index.js'),
    path.join(ROOT, 'packages', 'contract', 'managed', 'cohort', 'contract', 'index.js'),
  ];
  const attempts = [];
  for (const p of candidates) {
    try {
      await fs.promises.access(p, fs.constants.R_OK);
      const mod = await import(`file://${p}`);
      // Circuits live on the instance (this.circuits = {...} in the
      // constructor), not on the prototype, in compactc 0.31.x output.
      // Instantiate with throwing stubs to verify the attestation API exists.
      let hasCircuits = false;
      try {
        const probe = new mod.Contract({
          wAge: () => { throw 0; }, wCondition: () => { throw 0; },
          wMedication: () => { throw 0; }, wSecret: () => { throw 0; },
          wBlind: () => { throw 0; }, wHolderSecret: () => { throw 0; },
          wNonce: () => { throw 0; }, wIssuerSecret: () => { throw 0; },
        });
        hasCircuits =
          mod &&
          typeof mod.Contract === 'function' &&
          typeof mod.ledger === 'function' &&
          mod.pureCircuits &&
          typeof mod.pureCircuits.attestationOf === 'function' &&
          typeof mod.pureCircuits.issuerIdOf === 'function' &&
          probe.circuits &&
          typeof probe.circuits.attest === 'function' &&
          typeof probe.circuits.proveAttested === 'function' &&
          typeof probe.circuits.attestWithAttributes === 'function' &&
          typeof probe.circuits.initIssuer === 'function';
      } catch { hasCircuits = false; }
      if (hasCircuits) return { sourcePath: p, mod };
      attempts.push(`${p}: present but missing the attestation circuits (stale copy)`);
    } catch (err) {
      attempts.push(`${p}: ${err.message}`);
    }
  }
  throw new Error(`no usable compiled contract. ${attempts.join(' | ')}`);
}

function zkKeysDirFor(sourcePath) {
  const compileOut = path.join(ROOT, 'packages', 'contract', '.compile-out');
  if (sourcePath.startsWith(compileOut)) return path.join(compileOut, 'keys');
  return path.join(ROOT, 'packages', 'contract', 'zk');
}

/* ----------------------------------------------------------------- --deploy */

/**
 * CHAIN WRITE. Deploys the compiled COHORT contract to Preprod.
 *
 * Steps:
 *   1. Re-run the funding gate (--check logic); abort unless GO.
 *   2. Resolve the latest generated contract (loadGeneratedContract).
 *   3. Init the WalletFacade from the seed (official pattern from
 *      docs.midnight.network/sdks/official/wallet-developer-guide).
 *   4. Build midnight-js providers (indexer public data, level private state,
 *      node ZK config, HTTP proof provider, facade-backed wallet provider).
 *   5. deployContract(...) -> contract address + deploy tx.
 *   6. Truth-gate: poll the indexer contractAction(address) until the state
 *      appears, decode it with the generated ledger(), and verify it is the
 *      fresh zero state of THIS compiled artifact.
 *   7. Print { txHash, contractAddress, truthGate } as JSON.
 */
async function runDeploy() {
  const env = loadEnv();
  const secrets = secretsOf(env);
  const fail = (message, code = 1) => {
    process.stderr.write(redact(`deploy aborted: ${message}\n`, secrets));
    process.exit(code);
  };

  // 1. Funding gate first. Never deploy blind.
  //    COHORT_DEPLOY_BYPASS_GENERATION_FLAG=1 skips the *generation-registration*
  //    check only (documented in docs/owner-deploy-runbook.md). The wallet sync
  //    below still reveals the true spendable DUST balance; balanceTx fails
  //    loudly if there is nothing to spend. Use when DUST was sponsored/
  //    transferred directly rather than generated.
  process.stderr.write('deploy: running funding gate (--check)...\n');
  const gate = await runCheck();
  const bypassGen = process.env.COHORT_DEPLOY_BYPASS_GENERATION_FLAG === '1';
  if (!gate.fundingGate?.deployAllowed) {
    if (bypassGen && gate.dustGeneration?.registered === false) {
      process.stderr.write(
        'deploy: BYPASSING generation-registration gate (explicit flag). ' +
          'Wallet sync will prove the real balance; aborting now would hide it.\n'
      );
    } else {
      fail(`funding gate is ${gate.fundingGate?.verdict}: ${gate.fundingGate?.reason}`);
    }
  } else {
    process.stderr.write(`deploy: funding gate GO (${gate.dustGeneration.currentDust} available, cap ${gate.dustGeneration.maxDust})\n`);
  }

  // 2. Latest compiled contract.
  const { sourcePath, mod } = await loadGeneratedContract();
  process.stderr.write(`deploy: using compiled contract ${sourcePath}\n`);
  const keysDir = zkKeysDirFor(sourcePath);
  for (const circuit of ['attest', 'attestWithAttributes', 'proveAttested', 'proveEligible', 'initIssuer']) {
    for (const ext of ['verifier', 'prover']) {
      try {
        await fs.promises.access(path.join(keysDir, `${circuit}.${ext}`), fs.constants.R_OK);
      } catch {
        fail(`ZK artifact missing: ${keysDir}/${circuit}.${ext}`);
      }
    }
  }

  // 3. Wallet facade from the seed (official init pattern).
  const derived = await deriveFromSeed(env.MIDNIGHT_PREPROD_SEED);
  const projectId = env.BLOCKFROST_PROJECT_ID;
  const withKey = (u) => withProjectId(u, projectId);
  const { WalletFacade, WalletEntrySchema, mergeWalletEntries } = await import('@midnight-ntwrk/wallet-sdk-facade');
  const { InMemoryTransactionHistoryStorage } = await import('@midnight-ntwrk/wallet-sdk-abstractions');
  const { DustWallet } = await import('@midnight-ntwrk/wallet-sdk-dust-wallet');
  const { ShieldedWallet } = await import('@midnight-ntwrk/wallet-sdk-shielded');
  const { UnshieldedWallet, PublicKey } = await import('@midnight-ntwrk/wallet-sdk-unshielded-wallet');
  const ledger = await import('@midnight-ntwrk/ledger-v8');

  const configuration = {
    networkId: NETWORK_ID,
    costParameters: { feeBlocksMargin: 5 },
    relayURL: new URL(withKey(BLOCKFROST_RPC_WS)),
    provingServerUrl: new URL(env.MIDNIGHT_PROOF_SERVER),
    indexerClientConnection: {
      indexerHttpUrl: withKey(BLOCKFROST_INDEXER_HTTP),
      indexerWsUrl: withKey(BLOCKFROST_INDEXER_WS),
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
  };
  const { shieldedSecretKeys, dustSecretKey, unshieldedKeystore } = derived;
  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) => ShieldedWallet(config).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (config) => UnshieldedWallet(config).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (config) => DustWallet(config).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  process.stderr.write('deploy: wallet facade initialized, syncing...\n');
  await facade.start(shieldedSecretKeys, dustSecretKey);
  // Sync with a timeout so we fail fast instead of hanging forever.
  // If this times out, the VM likely cannot complete wallet sync.
  const syncTimeoutMs = parseInt(process.env.COHORT_SYNC_TIMEOUT_MS || '600000', 10);
  process.stderr.write(`deploy: waiting for sync (timeout ${syncTimeoutMs}ms)...\n`);
  const synced = await Promise.race([
    facade.waitForSyncedState(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`wallet sync timed out after ${syncTimeoutMs}ms`)), syncTimeoutMs)
    ),
  ]);
  process.stderr.write(`deploy: synced. dust=${synced.dust.balance(new Date()).toString()} specks\n`);

  // 4. midnight-js providers.
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
  const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
  const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
  const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');

  const psPassword = process.env.COHORT_DEPLOYER_PS_PASSWORD;
  if (!psPassword) fail('COHORT_DEPLOYER_PS_PASSWORD is required for the private-state store');
  const providers = {
    publicDataProvider: indexerPublicDataProvider(withKey(BLOCKFROST_INDEXER_HTTP), withKey(BLOCKFROST_INDEXER_WS)),
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'cohort-deployer',
      privateStoragePasswordProvider: async () => psPassword,
      accountId: derived.dustAddress,
    }),
    zkConfigProvider: new NodeZkConfigProvider(keysDir),
    proofProvider: null, // set below (needs zkConfigProvider)
    walletProvider: {
      async balanceTx(tx, ttl) {
        const recipe = await facade.balanceUnboundTransaction(
          tx,
          { shieldedSecretKeys, dustSecretKey },
          { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
        );
        const signed = await facade.signRecipe(recipe, (payload) => unshieldedKeystore.signData(payload));
        return facade.finalizeRecipe(signed);
      },
      getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
    },
    midnightProvider: {
      submitTx: (tx) => facade.submitTransaction(tx),
    },
  };
  providers.proofProvider = httpClientProofProvider(env.MIDNIGHT_PROOF_SERVER, providers.zkConfigProvider);

  // 5. Deploy. Witness stubs throw if ever invoked (deploy runs no circuits).
  const witnessStub = () => {
    throw new Error('witness invoked during deploy (should not happen)');
  };
  const contract = new mod.Contract({
    wAge: witnessStub,
    wCondition: witnessStub,
    wMedication: witnessStub,
    wSecret: witnessStub,
    wBlind: witnessStub,
    wHolderSecret: witnessStub,
    wNonce: witnessStub,
    wIssuerSecret: witnessStub,
  });
  process.stderr.write('deploy: submitting deploy transaction...\n');
  const deployed = await deployContract(providers, {
    contract,
    privateStateId: 'cohortDeployerPrivateState',
    initialPrivateState: null,
  });
  const contractAddress = deployed.contractAddress;
  const txHash = deployed.deployTxData?.public?.txId ?? deployed.deployTxData?.txId ?? null;
  process.stderr.write(`deploy: submitted. address=${contractAddress} tx=${txHash}\n`);

  // 6. Truth-gate: read the contract back from the indexer and decode it.
  const { ContractState } = await import('@midnight-ntwrk/midnight-js-protocol/compact-runtime');
  const truth = await truthGateContract(contractAddress, mod, withKey(BLOCKFROST_INDEXER_HTTP));

  await facade.stop();
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        mode: 'deploy',
        network: 'preprod',
        contractAddress,
        txHash,
        contractSource: sourcePath,
        truthGate: truth,
      },
      null,
      2,
    ) + '\n',
  );
}

/**
 * Truth-gate: poll the indexer until contractAction(address) returns state,
 * decode it with the generated ledger(), and verify it is the fresh zero
 * state of the deployed artifact.
 */
async function truthGateContract(contractAddress, gen, indexerHttp) {
  const deadline = Date.now() + 5 * 60 * 1000;
  let hex = null;
  let blockHeight = null;
  while (Date.now() < deadline) {
    try {
      const data = await gqlPost(
        indexerHttp,
        `query TruthGate($address: HexEncoded!) {
          contractAction(address: $address) { state transaction { block { height } } }
        }`,
        { address: contractAddress },
        { timeoutMs: 20000 },
      );
      const action = data?.contractAction;
      if (action?.state && /^[0-9a-fA-F]+$/.test(action.state)) {
        hex = action.state;
        blockHeight = action?.transaction?.block?.height ?? null;
        break;
      }
    } catch {
      // indexer may lag the deploy; keep polling
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  if (!hex) throw new Error('truth-gate timed out: indexer has no state for the deployed contract after 5 minutes');

  const { ContractState } = await import('@midnight-ntwrk/midnight-js-protocol/compact-runtime');
  const state = ContractState.deserialize(Buffer.from(hex, 'hex'));
  const pub = gen.ledger(state.data);
  const zero32 = '00'.repeat(32);
  const checks = {
    spentEmpty: Number(pub.spent.size().toString()) === 0,
    referralsEmpty: Number(pub.referrals.size().toString()) === 0,
    provenZero: pub.proven.toString() === '0',
    attestationsEmpty: Number(pub.attestations.size().toString()) === 0,
    attestationsVerifiedZero: pub.attestationsVerified.toString() === '0',
    issuerIdZero: Buffer.from(pub.issuerId).toString('hex') === zero32,
  };
  const pass = Object.values(checks).every(Boolean);
  return { pass, blockHeight, checks, stateBytes: hex.length / 2 };
}

/* ------------------------------------------------------------------ main */

const mode = process.argv[2];
if (mode === '--check') {
  runCheck().catch((err) => {
    process.stdout.write(JSON.stringify({ ok: false, mode: 'check', error: String(err?.message || err) }, null, 2) + '\n');
    process.exit(1);
  });
} else if (mode === '--deploy') {
  runDeploy().catch((err) => {
    process.stderr.write(`deploy failed: ${String(err?.message || err)}\n`);
    process.exit(1);
  });
} else {
  process.stderr.write('usage: node scripts/deployer.mjs --check | --deploy\n');
  process.exit(2);
}
