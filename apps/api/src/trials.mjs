/** Public typed subset only. Free-text eligibility is never executed as Compact. */
export const PUBLIC_TRIALS = [
  {
    trialId: 'NCT07153614',
    title: 'Perioperative opioid-sparing techniques (typed subset)',
    minAge: 18,
    maxAge: 80,
    sexCriterion: 'ALL',
    healthyVolunteers: false,
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Listed surgical oncology indication (sponsor-mapped flag)',
    medicationLabel: 'Chronic opioid / excluded med flag',
    source: 'https://clinicaltrials.gov/study/NCT07153614',
    mapping: 'hand-mapped typed subset; free-text criteria are not in the circuit',
  },
  {
    trialId: 'NCT04200963',
    title: 'IK-175 solid tumors (typed subset)',
    minAge: 18,
    maxAge: 120,
    sexCriterion: 'ALL',
    healthyVolunteers: false,
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'Locally advanced or metastatic solid tumor (sponsor-mapped flag)',
    medicationLabel: null,
    source: 'https://clinicaltrials.gov/study/NCT04200963',
    mapping: 'hand-mapped typed subset; ECOG/QTc/washouts are not in the circuit',
  },
];

export function getTrial(trialId) {
  return PUBLIC_TRIALS.find((t) => t.trialId === trialId) || null;
}
