/** Hand-mapped flags only. Free-text eligibility is never executed as Compact and never LLM-mapped. */
export const TRIAL_MAPPINGS = Object.freeze({
  NCT07153614: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Listed surgical oncology indication (sponsor-mapped flag)',
    medicationLabel: 'Chronic opioid / excluded med flag',
    mapping: 'hand-mapped typed subset; free-text criteria are not in the circuit',
    unsupportedCriteria: 'pregnancy, language, incision type, anticoagulants, and free-text inclusion/exclusion are not proven',
  }),
  NCT04200963: Object.freeze({
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'Locally advanced or metastatic solid tumor (sponsor-mapped flag)',
    medicationLabel: null,
    mapping: 'hand-mapped typed subset; ECOG/QTc/washouts are not in the circuit',
    unsupportedCriteria: 'ECOG, QTc, washouts, CNS mets, and free-text inclusion/exclusion are not proven',
  }),
});

export const CTGOV_STUDY_URL = 'https://clinicaltrials.gov/api/v2/studies';

const cache = { at: 0, trials: null };
const TTL_MS = 5 * 60 * 1000;

function inNodeTest() {
  return typeof process !== 'undefined' && Boolean(process.env.NODE_TEST_CONTEXT);
}

export function parseAgeYears(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 0 || n > 255) return null;
  return n;
}

export function publicTrialFromStudy(nctId, study, mapping) {
  const protocol = study?.protocolSection || {};
  const ident = protocol.identificationModule || {};
  const elig = protocol.eligibilityModule || {};
  const minAge = parseAgeYears(elig.minimumAge);
  if (minAge == null) {
    throw new Error(`ClinicalTrials.gov study ${nctId} is missing typed minimumAge`);
  }
  const maxAge = parseAgeYears(elig.maximumAge) ?? 255;
  const sexCriterion = typeof elig.sex === 'string' ? elig.sex : 'ALL';
  const healthyVolunteers = Boolean(elig.healthyVolunteers);
  return {
    trialId: nctId,
    title: `${ident.briefTitle || nctId} (typed subset)`,
    minAge,
    maxAge,
    sexCriterion,
    healthyVolunteers,
    requireCondition: mapping.requireCondition,
    forbidMedication: mapping.forbidMedication,
    conditionLabel: mapping.conditionLabel,
    medicationLabel: mapping.medicationLabel,
    source: `https://clinicaltrials.gov/study/${nctId}`,
    mapping: mapping.mapping,
    unsupportedCriteria: mapping.unsupportedCriteria,
    fetchedFrom: 'clinicaltrials.gov/api/v2',
  };
}

async function readFixtureStudy(nctId) {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const file = path.join(root, 'TESTS', 'fixtures', `ctgov-${nctId.toLowerCase()}.json`);
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function fetchStudy(nctId, fetchImpl = globalThis.fetch) {
  if (!fetchImpl) throw new Error('fetch is unavailable');
  const url = `${CTGOV_STUDY_URL}/${encodeURIComponent(nctId)}`;
  const res = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
  });
  if (!res.ok) {
    throw new Error(`ClinicalTrials.gov returned ${res.status}`);
  }
  return res.json();
}

export async function getPublicTrials(opts = {}) {
  const now = Date.now();
  if (cache.trials && now - cache.at < TTL_MS && !opts.force && !opts.live) {
    return cache.trials;
  }

  const ids = Object.keys(TRIAL_MAPPINGS);
  const useFixtures = inNodeTest() && !opts.live && !opts.fetchImpl;
  try {
    const trials = [];
    for (const nctId of ids) {
      const study = useFixtures
        ? await readFixtureStudy(nctId)
        : await fetchStudy(nctId, opts.fetchImpl || globalThis.fetch);
      trials.push(publicTrialFromStudy(nctId, study, TRIAL_MAPPINGS[nctId]));
    }
    cache.trials = trials;
    cache.at = now;
    if (useFixtures) {
      for (const trial of trials) trial.fetchedFrom = 'test-fixture';
    }
    return trials;
  } catch (err) {
    if (cache.trials) {
      return cache.trials.map((t) => ({ ...t, sourceStatus: 'stale-cache' }));
    }
    if (inNodeTest() && !opts.live) {
      const trials = [];
      for (const nctId of ids) {
        const study = await readFixtureStudy(nctId);
        const trial = publicTrialFromStudy(nctId, study, TRIAL_MAPPINGS[nctId]);
        trial.fetchedFrom = 'test-fixture';
        trials.push(trial);
      }
      cache.trials = trials;
      cache.at = now;
      return trials;
    }
    const error = new Error('clinicaltrials.gov unavailable');
    error.status = 503;
    error.cause = err;
    throw error;
  }
}

export async function getTrial(trialId, opts = {}) {
  if (!TRIAL_MAPPINGS[trialId]) return null;
  const trials = await getPublicTrials(opts);
  return trials.find((t) => t.trialId === trialId) || null;
}

export function knownTrialId(trialId) {
  return Boolean(TRIAL_MAPPINGS[trialId]);
}

/** @deprecated use getPublicTrials(). Kept as mapping-only allowlist shape for tests that only need ids. */
export const PUBLIC_TRIAL_IDS = Object.freeze(Object.keys(TRIAL_MAPPINGS));
