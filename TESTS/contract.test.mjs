import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot, prove, publicLedger, makePatient, RT, bytes32 } from './circuit-lib.mjs';

test('A eligible user proof succeeds', () => {
  const session = boot();
  const out = prove(session, makePatient({ age: 31n, condition: true, medication: false }));
  assert.equal(out.result, true);
  assert.equal(publicLedger(out).proven.toString(), '1');
});

test('B too young proof fails', () => {
  const session = boot();
  assert.throws(
    () => prove(session, makePatient({ age: 17n }), { minAge: 18n, maxAge: 80n }),
    /too young/,
  );
});

test('C too old proof fails', () => {
  const session = boot();
  assert.throws(
    () => prove(session, makePatient({ age: 81n }), { minAge: 18n, maxAge: 80n }),
    /too old/,
  );
});

test('D missing required condition fails', () => {
  const session = boot();
  assert.throws(
    () => prove(session, makePatient({ condition: false })),
    /missing condition/,
  );
});

test('E forbidden medication present fails', () => {
  const session = boot();
  assert.throws(
    () => prove(session, makePatient({ medication: true })),
    /medication excluded/,
  );
});

test('F replay protection rejects same trial + secret', () => {
  const session = boot();
  const first = prove(session, makePatient());
  assert.throws(
    () =>
      prove(session, makePatient(), {
        contractState: first.context.currentQueryContext.state,
      }),
    /already proven this trial/,
  );
});

test('G trial-scoped nullifiers are distinct', () => {
  const session = boot();
  const first = prove(session, makePatient(), { trialByte: 1 });
  const second = prove(session, makePatient(), {
    trialByte: 2,
    contractState: first.context.currentQueryContext.state,
  });
  const spent = [...publicLedger(second).spent].map((x) => RT.toHex(x));
  assert.equal(spent.length, 2);
  assert.notEqual(spent[0], spent[1]);
});

test('H fresh blinds produce distinct commitments', () => {
  const session = boot();
  const a = prove(session, makePatient({ blind: bytes32(1) }), { trialByte: 1 });
  const b = prove(session, makePatient({ blind: bytes32(2) }), {
    trialByte: 2,
    contractState: a.context.currentQueryContext.state,
  });
  const refs = [...publicLedger(b).referrals].map((x) => RT.toHex(x));
  assert.equal(refs.length, 2);
  assert.notEqual(refs[0], refs[1]);
});

test('I reused blind collapses referral set — application must mint fresh blinds', () => {
  const session = boot();
  const same = makePatient({ blind: bytes32(9) });
  const a = prove(session, same, { trialByte: 1 });
  const b = prove(session, same, {
    trialByte: 2,
    contractState: a.context.currentQueryContext.state,
  });
  assert.equal(publicLedger(b).referrals.size().toString(), '1');
});

test('public circuit output is boolean only — no age reconstruction', () => {
  const session = boot();
  const out = prove(session, makePatient({ age: 31n }));
  const dump = JSON.stringify(out.result);
  assert.equal(dump, 'true');
  assert.equal(dump.includes('31'), false);
});

test('proveEligible claims match generated witnesses and non-claims', async () => {
  const { PROVE_ELIGIBLE_CLAIMS } = await import('../packages/dapp/src/claims.mjs');
  const generated = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages/contract/managed/cohort/contract/index.js'),
    'utf8',
  );
  assert.match(generated, /function-valued field named wAge/);
  assert.match(generated, /function-valued field named wBlind/);
  assert.equal(generated.includes('named wSex'), false);
  assert.equal(PROVE_ELIGIBLE_CLAIMS.unusedWitnesses.includes('wSex'), true);
  assert.ok(PROVE_ELIGIBLE_CLAIMS.doesNotProve.some((s) => s.toLowerCase().includes('fhir')));
  assert.ok(PROVE_ELIGIBLE_CLAIMS.proves.some((s) => s.includes('minAge')));
  assert.equal(
    PROVE_ELIGIBLE_CLAIMS.contractAddress,
    '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc',
  );
});
