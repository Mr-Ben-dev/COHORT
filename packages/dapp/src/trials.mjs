import { CohortError, ErrorCode } from './errors.mjs';
import { assertPrivateFactsShape } from './types.mjs';
import { PROVE_ELIGIBLE_CLAIMS } from './claims.mjs';

function apiOrigin(opts = {}) {
  if (opts.origin) return String(opts.origin).replace(/\/$/, '');
  if (typeof globalThis.location?.origin === 'string' && globalThis.location.origin) {
    return globalThis.location.origin.replace(/\/$/, '');
  }
  return null;
}

export async function getTrials(opts = {}) {
  const origin = apiOrigin(opts);
  if (origin) {
    const res = await fetch(`${origin}/api/trials`);
    if (!res.ok) {
      throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Public trials could not be loaded.');
    }
    const body = await res.json();
    return body.trials || [];
  }
  const { getPublicTrials } = await import('../../../apps/api/src/trials.mjs');
  return getPublicTrials(opts);
}

export async function getTrial(trialId, opts = {}) {
  const origin = apiOrigin(opts);
  if (origin) {
    const res = await fetch(`${origin}/api/trials/${encodeURIComponent(trialId)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Public trial could not be loaded.');
    }
    const body = await res.json();
    return body.trial || null;
  }
  const { getTrial: load } = await import('../../../apps/api/src/trials.mjs');
  return load(trialId, opts);
}

export function checkEligibility(facts, trial) {
  if (!assertPrivateFactsShape(facts)) {
    throw new CohortError(ErrorCode.PRIVATE_FIELD, 'Local facts {age, condition, medication} are required.');
  }
  if (!trial) {
    throw new CohortError(ErrorCode.UNSUPPORTED_CRITERIA, 'Unknown trial.');
  }
  const ageOk = facts.age >= trial.minAge && facts.age <= trial.maxAge;
  const conditionOk = !trial.requireCondition || facts.condition === true;
  const medicationOk = !trial.forbidMedication || facts.medication === false;
  return {
    eligiblePreview: ageOk && conditionOk && medicationOk,
    mapping: trial.mapping,
    unsupportedCriteria: trial.unsupportedCriteria || trial.mapping,
    circuitDoesNotProve: PROVE_ELIGIBLE_CLAIMS.doesNotProve,
  };
}
