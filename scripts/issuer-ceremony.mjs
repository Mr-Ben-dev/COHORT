#!/usr/bin/env node
/**
 * COHORT — DEMO ISSUER key ceremony.
 *
 * DEMO ONLY: the "issuer" here is a synthetic demo identity. It is NOT a real
 * hospital, NOT a real medical authority, NOT any real-world trusted party.
 * Every secret and patient in this script is random/synthetic demo data.
 *
 * What this script does:
 *   1. Generates a fresh 32-byte DEMO issuerSecret (crypto.randomBytes).
 *   2. Boots the compact-runtime simulator against the COMPILED contract
 *      (packages/contract/managed/cohort/contract/index.js).
 *   3. Calls the `issuerIdOf` circuit with the DEMO issuerSecret and prints the
 *      resulting ISSUER_ID (the public issuer identity).
 *   4. Prints the DEPLOYER STEP: after the contract is deployed, the
 *      deployer installs this ISSUER_ID by calling the initIssuer(id) circuit
 *      once (one-time; the zeros check locks it). The contract source is NOT
 *      patched — compactc 0.31.1 UTF-8-encodes \\xNN escapes >= 0x80, so an
 *      arbitrary 32-byte secret cannot live in a string literal.
 *   5. Issues demo attestations for 3 synthetic judge patients via the
 *      `attestationOf` circuit (random holderSecret + nonce each).
 *   6. Writes TESTS/judge-credentials/judge{1,2,3}.json for the judges.
 *   7. Saves the DEMO issuer secret to scripts/.issuer-secret.json (gitignored,
 *      chmod 600).
 *
 * SECURITY: the issuer secret is NEVER printed to stdout and NEVER committed.
 * Only derived PUBLIC values (ISSUER_ID, attestation hexes) are printed.
 *
 * Requires the B1 contract interface (issuerIdOf, attestationOf, ISSUER_ID).
 * Aborts with exit 2 if the compiled contract does not expose it.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RT = require('@midnight-ntwrk/compact-runtime');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hexOf = (u8) => Buffer.from(u8).toString('hex');

function fail(msg) {
  process.stderr.write(`ceremony: FATAL: ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------- simulator boot
const contractUrl = pathToFileURL(
  path.join(root, 'packages', 'contract', 'managed', 'cohort', 'contract', 'index.js'),
).href;
let Contract;
try {
  ({ Contract } = await import(contractUrl));
} catch (e) {
  fail(`cannot load compiled contract at ${contractUrl}: ${e.message}`);
}

// Private state must supply every declared witness of the contract. Values are
// dummies — issuerIdOf/attestationOf take their inputs as circuit arguments.
const privateState = {
  age: 0n,
  condition: false,
  medication: false,
  secret: new Uint8Array(32),
  blind: new Uint8Array(32),
  holderSecret: new Uint8Array(32),
  nonce: new Uint8Array(32),
  issuerSecret: new Uint8Array(32),
};
const witnesses = {};
for (const [name, value] of Object.entries(privateState)) {
  witnesses[`w${name[0].toUpperCase()}${name.slice(1)}`] = (ctx) => [ctx.privateState, value];
}

let contract;
try {
  contract = new Contract(witnesses);
} catch (e) {
  fail(`Contract constructor rejected witnesses (interface drift?): ${e.message}`);
}

const addr = RT.sampleContractAddress();
const ctor = contract.initialState(RT.createConstructorContext(privateState, '0'.repeat(64)));

// Pure exported circuits (issuerIdOf, attestationOf) live under `circuits`;
// ledger-touching ones under `impureCircuits`. Look in both.
function circ(name) {
  return (contract.circuits && contract.circuits[name]) || (contract.impureCircuits && contract.impureCircuits[name]);
}

if (typeof circ('issuerIdOf') !== 'function') {
  fail('compiled contract does not expose the issuerIdOf circuit — B1 interface not yet delivered; aborting.');
}
if (typeof circ('attestationOf') !== 'function') {
  fail('compiled contract does not expose the attestationOf circuit — B1 interface not yet delivered; aborting.');
}

// ---------------------------------------------------------------- DEMO ISSUER key
const issuerSecret = crypto.randomBytes(32); // DEMO ISSUER secret — never printed, never committed
const secretPath = path.join(root, 'scripts', '.issuer-secret.json');
fs.writeFileSync(
  secretPath,
  JSON.stringify(
    {
      label: 'DEMO ISSUER — synthetic demo key, not a real hospital or medical authority',
      issuerSecretHex: hexOf(issuerSecret),
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
);

const issuerIdRes = circ('issuerIdOf')(ctx(), issuerSecret);
const ISSUER_ID = hexOf(issuerIdRes.result ?? issuerIdRes);

function ctx() {
  return RT.createCircuitContext(addr, '0'.repeat(64), ctor.currentContractState, privateState);
}

// ---------------------------------------------------------------- deployer step (no source patching)
// The issuer identity lives in the `issuerId` LEDGER, installed once by the
// deployer via initIssuer(id) after deploy. The contract source is never
// patched: compactc 0.31.1 interprets \xNN escapes as Unicode codepoints and
// UTF-8-encodes them, so an arbitrary 32-byte secret cannot be written as a
// string literal. The deployer reads the secret from
// scripts/.issuer-secret.json (saved above) and calls initIssuer() once.
// (The ISSUER_ID printed below is the public identity to install.)

// ---------------------------------------------------------------- demo patient attestations
const patients = [
  { id: 'judge1', age: 42n, condition: true, medication: false },
  { id: 'judge2', age: 67n, condition: true, medication: true },
  { id: 'judge3', age: 29n, condition: false, medication: false },
];
const credDir = path.join(root, 'TESTS', 'judge-credentials');
fs.mkdirSync(credDir, { recursive: true });

const results = [];
for (const p of patients) {
  const holderSecret = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(32);
  const attRes = circ('attestationOf')(
    ctx(),
    p.age,
    p.condition,
    p.medication,
    holderSecret,
    nonce,
  );
  const attestation = attRes.result ?? attRes;
  const cred = {
    label: 'DEMO — synthetic data, not a real patient',
    age: Number(p.age),
    condition: p.condition,
    medication: p.medication,
    holderSecretHex: hexOf(holderSecret),
    nonceHex: hexOf(nonce),
    attestationHex: hexOf(attestation),
    trialId: 'NCT07153614',
  };
  fs.writeFileSync(path.join(credDir, `${p.id}.json`), JSON.stringify(cred, null, 2) + '\n');
  results.push({ id: p.id, attestationHex: cred.attestationHex });
}

// ---------------------------------------------------------------- summary (public values only)
console.log('=== COHORT demo-issuer key ceremony — PUBLIC OUTPUT ===');
console.log('(DEMO ISSUER: synthetic demo identity, not a real hospital or medical authority)');
console.log(`ISSUER_ID: 0x${ISSUER_ID}`);
for (const r of results) console.log(`${r.id} attestation: 0x${r.attestationHex}`);
console.log('');
console.log('NEXT STEP — deploy, then the deployer installs the issuer ID:');
console.log('  node scripts/deployer.mjs --deploy            # deploys the contract');
console.log('  # then call initIssuer(issuerSecret) once with the secret from');
console.log('  # scripts/.issuer-secret.json (deployer wallet)');
console.log('(demo issuer secret saved to scripts/.issuer-secret.json — gitignored, mode 600, never printed)');
