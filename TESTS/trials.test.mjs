import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgeYears, publicTrialFromStudy, TRIAL_MAPPINGS, getPublicTrials } from '../apps/api/src/trials.mjs';
import { CohortDapp } from '../packages/dapp/src/index.mjs';
import { listenServer } from '../apps/api/src/server.mjs';
import { request } from './http.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('parseAgeYears handles CT.gov age strings', () => {
  assert.equal(parseAgeYears('18 Years'), 18);
  assert.equal(parseAgeYears('80 Years'), 80);
  assert.equal(parseAgeYears(null), null);
});

test('fixture NCT07153614 maps typed 18-80 and discloses unproven prose', () => {
  const study = JSON.parse(fs.readFileSync(path.join(root, 'TESTS/fixtures/ctgov-nct07153614.json'), 'utf8'));
  const trial = publicTrialFromStudy('NCT07153614', study, TRIAL_MAPPINGS.NCT07153614);
  assert.equal(trial.minAge, 18);
  assert.equal(trial.maxAge, 80);
  assert.equal(trial.requireCondition, true);
  assert.equal(trial.forbidMedication, true);
  assert.match(trial.mapping, /free-text/);
  assert.equal(Object.hasOwn(trial, 'eligibilityCriteria'), false);
  assert.equal(Object.hasOwn(trial, 'age'), false);
});

test('fixture NCT04200963 missing maximumAge becomes Uint8 255', () => {
  const study = JSON.parse(fs.readFileSync(path.join(root, 'TESTS/fixtures/ctgov-nct04200963.json'), 'utf8'));
  const trial = publicTrialFromStudy('NCT04200963', study, TRIAL_MAPPINGS.NCT04200963);
  assert.equal(trial.minAge, 18);
  assert.equal(trial.maxAge, 255);
  assert.match(trial.unsupportedCriteria, /ECOG/);
});

test('GET /api/trials serves typed subset from fixtures in node:test', async (t) => {
  const { server, url } = await listenServer();
  t.after(() => server.close());
  const res = await request(url, '/api/trials');
  assert.equal(res.status, 200);
  const nct = res.json.trials.find((x) => x.trialId === 'NCT07153614');
  assert.equal(nct.minAge, 18);
  assert.equal(nct.maxAge, 80);
  assert.equal(nct.age, undefined);
  assert.equal(nct.eligibilityCriteria, undefined);
  assert.match(res.json.mapping, /typed subset/);
});

test('CohortDapp.getTrials/checkEligibility stay local and do not invent proofs', async () => {
  const trials = await CohortDapp.getTrials();
  const trial = trials.find((x) => x.trialId === 'NCT07153614');
  const preview = CohortDapp.checkEligibility({ age: 31, condition: true, medication: false }, trial);
  assert.equal(preview.eligiblePreview, true);
  assert.ok(Array.isArray(preview.circuitDoesNotProve));
  const young = CohortDapp.checkEligibility({ age: 17, condition: true, medication: false }, trial);
  assert.equal(young.eligiblePreview, false);
});

test('live ClinicalTrials.gov NCT07153614 minimumAge is 18 Years', async () => {
  const trials = await getPublicTrials({ live: true, force: true });
  const nct = trials.find((x) => x.trialId === 'NCT07153614');
  assert.equal(nct.minAge, 18);
  assert.equal(nct.maxAge, 80);
  assert.equal(nct.fetchedFrom, 'clinicaltrials.gov/api/v2');
});
