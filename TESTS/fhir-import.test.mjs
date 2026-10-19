/**
 * TESTS/fhir-import.test.mjs — SQUAD D3 (FHIR R4 / Synthea synthetic-record import)
 *
 * - Parses the bundled synthetic patients and asserts the extracted
 *   attributes match the expected hand-written values.
 * - Asserts the parser performs ZERO network I/O: global fetch is replaced
 *   with a stub that throws, and the parser source is statically scanned for
 *   network APIs (fetch / XHR / sendBeacon / WebSocket / EventSource).
 *
 * Synthetic data only — every bundle is tagged synthetic-test-data and carries
 * a SYNTHETIC title. No real patient data anywhere.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(here, '..', 'web', 'public', 'fhir-demo');
const PARSER_PATH = join(here, '..', 'web', 'src', 'lib', 'fhir-import.mjs');

const {
  parseFhirBundle,
  computeAge,
  toCircuitAttributes,
  requestAttestation,
  setAttestationHandler,
} = await import(PARSER_PATH);

// Deterministic "today" for age assertions (birth dates are fixed).
const AS_OF = '2026-10-19';

function loadBundle(name) {
  return JSON.parse(readFileSync(join(DEMO_DIR, name), 'utf8'));
}

test('demo bundles exist, are small, and are explicitly tagged SYNTHETIC', () => {
  for (const name of ['patient-diabetic.json', 'patient-cardiac.json', 'patient-healthy.json']) {
    const path = join(DEMO_DIR, name);
    assert.ok(statSync(path).size < 15 * 1024, `${name} must stay < 15KB`);
    const bundle = loadBundle(name);
    assert.equal(bundle.resourceType, 'Bundle');
    const tags = (bundle.meta?.tag ?? []).map((t) => `${t.system}|${t.code}`);
    assert.ok(
      tags.includes('http://cohort.dev/fhir|synthetic-test-data'),
      `${name} must carry the synthetic-test-data tag`,
    );
    assert.ok(
      String(bundle.title).includes('SYNTHETIC'),
      `${name} title must say SYNTHETIC`,
    );
  }
});

test('diabetic bundle: age, conditions, labs, medications extracted per path map', () => {
  const { attributes, warnings } = parseFhirBundle(loadBundle('patient-diabetic.json'), { asOf: AS_OF });
  assert.equal(attributes.sourceLabel, 'SYNTHETIC');
  assert.equal(attributes.birthDate, '1962-05-14');
  assert.equal(attributes.age, 64);
  assert.equal(attributes.hasCondition, true);
  assert.equal(attributes.onMedication, true);

  const keys = attributes.conditions.map((c) => c.key).sort();
  assert.deepEqual(keys, ['diabetesType2', 'hypertension']);
  const t2d = attributes.conditions.find((c) => c.key === 'diabetesType2');
  assert.equal(t2d.code, '44054006');
  assert.equal(t2d.system, 'http://snomed.info/sct');

  const labByKey = Object.fromEntries(attributes.labs.map((l) => [l.key, l]));
  assert.equal(labByKey.hba1cPct.value, 7.2);
  assert.equal(labByKey.hba1cPct.code, '4548-4');
  assert.equal(labByKey.systolicBpMmHg.value, 138);
  assert.equal(labByKey.diastolicBpMmHg.value, 88);
  assert.equal(labByKey.ldlCholesterolMgDl.value, 142);

  const medKeys = attributes.medications.map((m) => m.key).sort();
  assert.deepEqual(medKeys, ['amlodipine', 'metformin']);
  assert.equal(attributes.medications[0].system, 'http://www.nlm.nih.gov/research/umls/rxnorm');

  assert.deepEqual(toCircuitAttributes(attributes), { age: 64, hasCondition: true, onMedication: true });
  assert.ok(warnings.length >= 0);
});

test('cardiac/CKD bundle: active conditions kept, resolved history filtered', () => {
  const { attributes } = parseFhirBundle(loadBundle('patient-cardiac.json'), { asOf: AS_OF });
  assert.equal(attributes.age, 70); // 1955-11-02, birthday not yet reached on 2026-10-19
  const keys = attributes.conditions.map((c) => c.key).sort();
  // The resolved childhood asthma (clinicalStatus=resolved) must NOT be flagged.
  assert.deepEqual(keys, ['chronicKidneyDisease', 'hypertension']);
  const labByKey = Object.fromEntries(attributes.labs.map((l) => [l.key, l]));
  assert.equal(labByKey.egfr.value, 45);
  assert.equal(labByKey.egfr.code, '48642-3');
  assert.equal(labByKey.systolicBpMmHg.value, 152);
  assert.deepEqual(attributes.medications.map((m) => m.key), ['amlodipine']);
  assert.deepEqual(toCircuitAttributes(attributes), { age: 70, hasCondition: true, onMedication: true });
});

test('healthy bundle: no conditions, no medications, normal labs', () => {
  const { attributes } = parseFhirBundle(loadBundle('patient-healthy.json'), { asOf: AS_OF });
  assert.equal(attributes.age, 29); // 1997-02-28
  assert.equal(attributes.hasCondition, false);
  assert.equal(attributes.onMedication, false);
  assert.deepEqual(attributes.conditions, []);
  assert.deepEqual(attributes.medications, []);
  const labByKey = Object.fromEntries(attributes.labs.map((l) => [l.key, l]));
  assert.equal(labByKey.hba1cPct.value, 5.1);
  assert.equal(labByKey.systolicBpMmHg.value, 112);
  assert.equal(labByKey.diastolicBpMmHg.value, 74);
  assert.deepEqual(toCircuitAttributes(attributes), { age: 29, hasCondition: false, onMedication: false });
});

test('computeAge handles edge cases without network', () => {
  assert.equal(computeAge('1962-05-14', '2026-10-19'), 64);
  assert.equal(computeAge('1955-11-02', '2026-10-19'), 70);
  assert.equal(computeAge('not-a-date', '2026-10-19'), undefined);
  assert.equal(computeAge(undefined, '2026-10-19'), undefined);
  assert.equal(computeAge('2030-01-01', '2026-10-19'), undefined);
});

test('parse rejects non-Bundle input', () => {
  assert.throws(() => parseFhirBundle({ resourceType: 'Patient' }), /FHIR R4 Bundle/);
  assert.throws(() => parseFhirBundle(null), /FHIR R4 Bundle/);
});

test('PARSER TRUST PIN: parse makes zero network calls', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  // Any network attempt fails loudly.
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('NETWORK CALL DURING PARSE — parser must be browser-local only');
  };
  try {
    for (const name of ['patient-diabetic.json', 'patient-cardiac.json', 'patient-healthy.json']) {
      const bundle = JSON.parse(readFileSync(join(DEMO_DIR, name), 'utf8'));
      const { attributes } = parseFhirBundle(bundle, { asOf: AS_OF });
      assert.ok(attributes.age !== undefined, `${name} should still parse with fetch stubbed`);
    }
    assert.equal(fetchCalls, 0, 'parser called fetch during parse');
  } finally {
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});

test('PARSER TRUST PIN: module source contains no network APIs', () => {
  let src = readFileSync(PARSER_PATH, 'utf8');
  // Strip comments so doc text (e.g. "calls no fetch()") cannot trip the scan.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
  const forbidden = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bsendBeacon\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /\bimport\s*\(['"`]https?:/,
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(src), `parser source matches forbidden network pattern ${re}`);
  }
});

test('requestAttestation: queued by default, handed to registered issuer when set', () => {
  const { attributes } = parseFhirBundle(loadBundle('patient-diabetic.json'), { asOf: AS_OF });

  setAttestationHandler(null);
  const queued = requestAttestation(attributes);
  assert.equal(queued.status, 'queued');
  assert.deepEqual(queued.circuitTuple, { age: 64, hasCondition: true, onMedication: true });
  assert.ok(queued.note.includes('nothing transmitted'), 'queued note must state nothing is transmitted');

  const seen = [];
  setAttestationHandler((attrs, tuple) => {
    seen.push({ attrs, tuple });
    return { status: 'attested', commitment: '0xdeadbeef-demo' };
  });
  const out = requestAttestation(attributes);
  assert.equal(out.status, 'attested');
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0].tuple, { age: 64, hasCondition: true, onMedication: true });
  setAttestationHandler(null);
});

test('requestAttestation refuses non-synthetic or out-of-range attributes', () => {
  const { attributes } = parseFhirBundle(loadBundle('patient-diabetic.json'), { asOf: AS_OF });
  assert.throws(() => toCircuitAttributes({ ...attributes, age: 300 }), /0–255/);
  assert.throws(() => toCircuitAttributes({ ...attributes, sourceLabel: 'UNVERIFIED' }), /non-synthetic/);
  assert.throws(() => requestAttestation({ ...attributes, age: 300 }), /0–255/);
});
