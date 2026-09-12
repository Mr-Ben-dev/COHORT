/**
 * Honest circuit claims for the deployed Preprod contract.
 * Not a UI string file — the future frontend must consume this object.
 *
 * Contract: 1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc
 * Circuit: proveEligible (CONTRACT/cohort.compact)
 */
export const PROVE_ELIGIBLE_CLAIMS = Object.freeze({
  circuitId: 'proveEligible',
  contractAddress: '1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc',
  proves: Object.freeze([
    'Private wAge is within the public [minAge, maxAge] bounds (Uint<8>).',
    'If requireCondition is true, private wCondition is true.',
    'If forbidMedication is true, private wMedication is false.',
    'trial-scoped nullifier persistentHash(["cohort:ref", trialId, wSecret]) was not already in spent.',
    'That nullifier is inserted into public spent.',
    'referral persistentCommit(wSecret, wBlind) is inserted into public referrals.',
    'Public proven counter increments by 1.',
  ]),
  doesNotProve: Object.freeze([
    'Medical-record authenticity, EHR signatures, or FHIR integrity.',
    'Issuer attestation.',
    'wSex (declared witness, unused in the circuit; compiler stripped it).',
    'Pregnancy, ECOG, labs, washouts, language, geography, or any free-text ClinicalTrials.gov criterion.',
    'That the user is a unique human (only uniqueness of (wSecret, trialId)).',
    'That public minAge/maxAge match ClinicalTrials.gov (application must bind args to /api/trials).',
  ]),
  publicDisclosures: Object.freeze(['spent nullifiers', 'referral commitments', 'proven counter']),
  unusedWitnesses: Object.freeze(['wSex']),
});
