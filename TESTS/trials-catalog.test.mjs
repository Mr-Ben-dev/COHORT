import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIAL_MAPPINGS, getPublicTrials } from '../apps/api/src/trials.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NCT_RE = /^NCT[0-9]{8}$/;

test('catalog holds exactly 12 hand-mapped trials with valid NCT IDs', () => {
  const ids = Object.keys(TRIAL_MAPPINGS);
  assert.equal(ids.length, 12);
  for (const id of ids) {
    assert.match(id, NCT_RE, `bad NCT id: ${id}`);
  }
});

test('every mapped trial carries provenance and a non-empty unsupported[] honesty list', () => {
  for (const [id, m] of Object.entries(TRIAL_MAPPINGS)) {
    assert.ok(m.provenance && typeof m.provenance === 'object', `${id} missing provenance`);
    assert.ok(
      typeof m.provenance.requireCondition === 'string' && m.provenance.requireCondition.length > 0,
      `${id} missing requireCondition provenance`,
    );
    assert.ok(
      m.provenance.forbidMedication === null ||
        (typeof m.provenance.forbidMedication === 'string' && m.provenance.forbidMedication.length > 0),
      `${id} forbidMedication provenance must be verbatim text or null`,
    );
    if (m.forbidMedication) {
      assert.ok(typeof m.provenance.forbidMedication === 'string', `${id} maps a med flag with no provenance`);
      assert.ok(typeof m.medicationLabel === 'string' && m.medicationLabel.length > 0, `${id} missing medicationLabel`);
    }
    assert.ok(Array.isArray(m.unsupported), `${id} missing unsupported[]`);
    assert.ok(m.unsupported.length > 0, `${id} has an empty unsupported[] — the honesty field is required`);
    assert.ok(typeof m.unsupportedCriteria === 'string' && m.unsupportedCriteria.length > 0, `${id} missing unsupportedCriteria`);
  }
});

test('12 trials load from fixtures, each typed, each with provenance + unsupported[]', async () => {
  const trials = await getPublicTrials({ force: true });
  assert.equal(trials.length, 12);
  for (const t of trials) {
    assert.match(t.trialId, NCT_RE);
    assert.ok(Number.isInteger(t.minAge), `${t.trialId} minAge not typed`);
    assert.ok(Number.isInteger(t.maxAge), `${t.trialId} maxAge not typed`);
    assert.ok(t.provenance && typeof t.provenance === 'object', `${t.trialId} missing provenance in output`);
    assert.ok(t.provenance.requireCondition && t.provenance.requireCondition.length > 0, `${t.trialId} empty provenance`);
    assert.ok(Array.isArray(t.unsupported) && t.unsupported.length > 0, `${t.trialId} missing non-empty unsupported[] in output`);
    assert.equal(t.eligibilityCriteria, undefined);
    assert.equal(t.age, undefined);
  }
});

test('provenance sentences are verbatim substrings of the raw fixture eligibilityCriteria', () => {
  for (const [id, m] of Object.entries(TRIAL_MAPPINGS)) {
    const study = JSON.parse(
      fs.readFileSync(path.join(root, 'TESTS', 'fixtures', `ctgov-${id.toLowerCase()}.json`), 'utf8'),
    );
    const criteria = study?.protocolSection?.eligibilityModule?.eligibilityCriteria || '';
    for (const sentence of String(m.provenance.requireCondition).split(' | ')) {
      assert.ok(criteria.includes(sentence), `${id}: requireCondition provenance not found verbatim in fixture`);
    }
    if (typeof m.provenance.forbidMedication === 'string') {
      for (const sentence of m.provenance.forbidMedication.split(' | ')) {
        assert.ok(criteria.includes(sentence), `${id}: forbidMedication provenance not found verbatim in fixture`);
      }
    }
  }
});

test('catalog spans oncology, cardiology, diabetes, and neurology', () => {
  const labels = Object.values(TRIAL_MAPPINGS).map((m) => m.conditionLabel.toLowerCase());
  assert.ok(labels.some((l) => l.includes('breast') || l.includes('solid tumor') || l.includes('nsclc')), 'oncology missing');
  assert.ok(labels.some((l) => l.includes('hypertension') || l.includes('atrial fibrillation') || l.includes('pulmonary arterial')), 'cardiology missing');
  assert.ok(labels.some((l) => l.includes('diabetes')), 'diabetes missing');
  assert.ok(labels.some((l) => l.includes('alzheimer') || l.includes('insomnia') || l.includes('neurocognitive')), 'neurology missing');
});
