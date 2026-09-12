/**
 * FHIR R4 Bundle -> COHORT typed facts.
 * Synthetic data only. Never put raw FHIR into Compact.
 */
export function normalizePatientBundle(bundle) {
  const patient = bundle.entry?.map((e) => e.resource).find((r) => r?.resourceType === 'Patient');
  if (!patient) throw new Error('no Patient resource');
  const year = Number(String(patient.birthDate || '').slice(0, 4));
  const ageYears = Number.isFinite(year) ? new Date().getUTCFullYear() - year : null;
  const sex =
    patient.gender === 'female' ? 2 :
    patient.gender === 'male' ? 1 : 0;
  const codes = [];
  const meds = [];
  for (const { resource } of bundle.entry || []) {
    if (resource?.resourceType === 'Condition') {
      const code = resource.code?.coding?.[0]?.code;
      if (code) codes.push(code);
    }
    if (resource?.resourceType === 'MedicationStatement' && resource.status === 'active') {
      const code = resource.medicationCodeableConcept?.coding?.[0]?.code;
      if (code) meds.push(code);
    }
  }
  return {
    ageYears,
    sex,
    hasCondition: (icd10) => codes.includes(icd10),
    hasMedication: (rxnorm) => meds.includes(rxnorm),
    conditionCodes: codes,
    medicationCodes: meds,
    witness: {
      age: BigInt(ageYears ?? 0),
      condition: codes.includes('E11.9'),
      medication: meds.length > 0,
    },
  };
}
