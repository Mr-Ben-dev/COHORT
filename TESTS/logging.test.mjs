import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../apps/api/src/redact.mjs';

test('redaction replaces medical and secret keys', () => {
  const out = redact({
    age: 31,
    witness: { condition: true },
    fhir: { birthDate: '1994-01-01' },
    authorization: 'Bearer secret-example',
    trialId: 'NCT07153614',
  });
  assert.equal(out.age, '[REDACTED]');
  assert.equal(out.witness, '[REDACTED]');
  assert.equal(out.fhir, '[REDACTED]');
  assert.equal(out.authorization, '[REDACTED]');
  assert.equal(out.trialId, 'NCT07153614');
});

test('token-shaped strings are redacted', () => {
  const github = ['ghp', '_notarealtoken'].join('');
  const render = ['rnd', '_notareal'].join('');
  assert.equal(redact(github), '[REDACTED]');
  assert.equal(redact(render), '[REDACTED]');
});
