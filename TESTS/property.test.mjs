import test from 'node:test';
import assert from 'node:assert/strict';
import { boot, prove, makePatient } from './circuit-lib.mjs';

const minAge = 18n;
const maxAge = 80n;

const ages = [minAge - 1n, minAge, minAge + 1n, maxAge - 1n, maxAge, maxAge + 1n];
const flags = [true, false];

test('property: age/condition/medication combinations match Compact asserts', () => {
  for (const age of ages) {
    for (const condition of flags) {
      for (const medication of flags) {
        const session = boot();
        const patient = makePatient({ age, condition, medication });
        let failed = null;
        try {
          prove(session, patient, { minAge, maxAge, requireCondition: true, forbidMedication: true });
        } catch (e) {
          failed = String(e.message || e);
        }
        const expectFail =
          age < minAge || age > maxAge || !condition || medication;
        if (expectFail) assert.ok(failed, `age=${age} cond=${condition} med=${medication}`);
        else assert.equal(failed, null, `age=${age} cond=${condition} med=${medication} ${failed}`);
      }
    }
  }
});
