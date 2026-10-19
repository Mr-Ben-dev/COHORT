/**
 * COHORT — browser-local FHIR R4 Bundle → attribute extraction.
 *
 * TRUST BOUNDARY (asserted, and pinned by TESTS/fhir-import.test.mjs):
 *   - This module performs ZERO network I/O. It calls no fetch(), no
 *     XMLHttpRequest, no navigator.sendBeacon, no WebSocket, no EventSource.
 *   - The bundle NEVER leaves the browser: parsing and attribute extraction
 *     happen in memory on the patient's device. Nothing is uploaded.
 *   - The only consumer of the extracted attributes is `requestAttestation()`
 *     (the demo issuer wiring — another worker's job), which receives them
 *     in memory. With real data this would be the patient's hospital/provider,
 *     whose role already includes seeing the record; with synthetic demo data
 *     it is disclosed as demo-grade (see docs/fhir-trust.md).
 *
 * fhirpath.js is not a dependency here; the path map below needs only a tiny
 * FHIR R4 subset (Patient.birthDate, Condition.code, Observation.valueQuantity,
 * MedicationRequest), so it is hand-rolled. If the path map grows beyond this
 * subset, adopt fhirpath.js instead of growing this file.
 */

export const PARSER_VERSION = 'cohort-fhir-import/1.0.0';
export const SYNTHETIC_TAG_SYSTEM = 'http://cohort.dev/fhir';
export const SYNTHETIC_TAG_CODE = 'synthetic-test-data';

const SNOMED_SYSTEM = 'http://snomed.info/sct';
const LOINC_SYSTEM = 'http://loinc.org';
const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const CLINICAL_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-clinical';

/**
 * Path map: code system + code → attribute flag key.
 * Deliberately small — eligibility predicates only.
 */
const CONDITION_MAP = {
  '44054006': 'diabetesType2', // SNOMED: Diabetes mellitus type 2
  '46635009': 'diabetesType1', // SNOMED: Diabetes mellitus type 1
  '38341003': 'hypertension', // SNOMED: Hypertensive disorder, systemic arterial
  '195967001': 'asthma', // SNOMED: Asthma
  '13645005': 'chronicBronchitis', // SNOMED: Chronic bronchitis (COPD)
  '84114007': 'heartFailure', // SNOMED: Heart failure
  '431855005': 'chronicKidneyDisease', // SNOMED: Chronic kidney disease
};

const LAB_MAP = {
  '4548-4': 'hba1cPct', // LOINC: HbA1c
  '8480-6': 'systolicBpMmHg', // LOINC: Systolic BP
  '8462-4': 'diastolicBpMmHg', // LOINC: Diastolic BP
  '48642-3': 'egfr', // LOINC: eGFR
  '13457-7': 'ldlCholesterolMgDl', // LOINC: LDL cholesterol
  '2339-0': 'glucoseMgDl', // LOINC: Glucose
  '2085-9': 'hdlCholesterolMgDl', // LOINC: HDL cholesterol
};

const MEDICATION_MAP = {
  '6809': 'metformin', // RxNorm: metformin
  '104375': 'atorvastatin', // RxNorm: atorvastatin
  '197361': 'amlodipine', // RxNorm: amlodipine
  '274783': 'insulinGlargine', // RxNorm: insulin glargine
};

function asArray(v) {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

/** Hand-rolled FHIR R4 subset path getter (no fhirpath.js). */
function codingDisplay(codings, system) {
  const hit = asArray(codings).find((c) => c && c.system === system && c.code);
  return hit || null;
}

function clinicalStatusOf(condition) {
  const coding = codingDisplay(condition?.clinicalStatus?.coding, CLINICAL_STATUS_SYSTEM);
  return coding ? coding.code : 'unknown';
}

/**
 * Compute whole-year age from an FHIR date (YYYY[-MM[-DD]]).
 * `asOf` is injectable for deterministic tests; defaults to now.
 */
export function computeAge(birthDate, asOf) {
  if (typeof birthDate !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(birthDate)) {
    return undefined;
  }
  const now = asOf ? new Date(asOf) : new Date();
  const [y, m = '01', d = '01'] = birthDate.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const monthDelta = now.getUTCMonth() + 1 - m;
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < d)) age -= 1;
  return age < 0 ? undefined : age;
}

function bundleEntries(bundle) {
  if (!bundle || typeof bundle !== 'object' || bundle.resourceType !== 'Bundle') {
    throw new Error('fhir-import: expected a FHIR R4 Bundle (resourceType === "Bundle")');
  }
  return asArray(bundle.entry).map((e) => e && e.resource).filter(Boolean);
}

function isSyntheticBundle(bundle) {
  return asArray(bundle?.meta?.tag).some(
    (t) => t && t.system === SYNTHETIC_TAG_SYSTEM && t.code === SYNTHETIC_TAG_CODE,
  );
}

/**
 * Parse a FHIR R4 Bundle (collection or transaction) into attestation-ready attributes.
 *
 * Extraction (the path map):
 *   Patient.birthDate                                  → age (whole years)
 *   Condition.code SNOMED-CT, clinicalStatus = active  → diagnosis flags
 *   Observation.code LOINC + valueQuantity             → labs
 *   MedicationRequest RxNorm, status = active          → medication flags
 *
 * @param {object} bundle  FHIR R4 Bundle JSON
 * @param {{ asOf?: string|Date }} [options]
 * @returns {{ attributes: ExtractedAttributes, warnings: string[] }}
 */
export function parseFhirBundle(bundle, options = {}) {
  const warnings = [];
  const entries = bundleEntries(bundle);

  const synthetic = isSyntheticBundle(bundle);
  if (!synthetic) {
    warnings.push(
      'bundle carries no cohort synthetic-test-data tag; parsing anyway — treat as unverified input',
    );
  }

  const attributes = {
    parserVersion: PARSER_VERSION,
    sourceLabel: synthetic ? 'SYNTHETIC' : 'UNVERIFIED',
    patientId: undefined,
    birthDate: undefined,
    age: undefined,
    hasCondition: false,
    onMedication: false,
    conditions: [],
    labs: [],
    medications: [],
  };

  const patients = entries.filter((r) => r.resourceType === 'Patient');
  if (patients.length === 0) {
    warnings.push('no Patient resource in bundle; age unavailable');
  } else {
    if (patients.length > 1) {
      warnings.push(`bundle contains ${patients.length} Patients; using the first`);
    }
    const patient = patients[0];
    attributes.patientId = patient.id;
    if (patient.birthDate) {
      attributes.birthDate = patient.birthDate;
      const age = computeAge(patient.birthDate, options.asOf);
      if (age === undefined) {
        warnings.push(`Patient.birthDate "${patient.birthDate}" is not parseable; age unavailable`);
      } else {
        attributes.age = age;
      }
    } else {
      warnings.push('Patient.birthDate missing; age unavailable');
    }
  }

  // Conditions — active only. (Known Synthea distortion: social determinants and
  // resolved history can be coded as active-looking Conditions; we require
  // clinicalStatus=active and ignore anything else.)
  for (const c of entries.filter((r) => r.resourceType === 'Condition')) {
    const status = clinicalStatusOf(c);
    const coding = codingDisplay(c.code?.coding, SNOMED_SYSTEM);
    if (!coding) {
      warnings.push(`Condition ${c.id || '(no id)'} has no SNOMED-CT coding; ignored`);
      continue;
    }
    if (status !== 'active') {
      warnings.push(
        `Condition ${coding.code} (${coding.display || 'no display'}) clinicalStatus=${status}; ignored (active only)`,
      );
      continue;
    }
    const key = CONDITION_MAP[coding.code];
    attributes.conditions.push({
      key: key || 'other',
      code: coding.code,
      system: SNOMED_SYSTEM,
      display: coding.display || coding.text || 'unknown',
      clinicalStatus: 'active',
      onsetDateTime: c.onsetDateTime,
    });
    if (key) attributes.hasCondition = true;
    else warnings.push(`Condition ${coding.code} not in eligibility path map; kept as "other"`);
  }

  // Observations — LOINC + valueQuantity only.
  for (const o of entries.filter((r) => r.resourceType === 'Observation')) {
    if (o.status && !['final', 'amended', 'corrected'].includes(o.status)) {
      warnings.push(`Observation ${o.id || '(no id)'} status=${o.status}; ignored`);
      continue;
    }
    const coding = codingDisplay(o.code?.coding, LOINC_SYSTEM);
    if (!coding) {
      warnings.push(`Observation ${o.id || '(no id)'} has no LOINC coding; ignored`);
      continue;
    }
    const vq = o.valueQuantity;
    if (!vq || typeof vq.value !== 'number') {
      warnings.push(`Observation ${coding.code} has no numeric valueQuantity; ignored`);
      continue;
    }
    const key = LAB_MAP[coding.code];
    if (!key) {
      warnings.push(`Observation LOINC ${coding.code} not in eligibility path map; ignored`);
      continue;
    }
    attributes.labs.push({
      key,
      code: coding.code,
      system: LOINC_SYSTEM,
      display: coding.display || 'unknown',
      value: vq.value,
      unit: vq.unit || vq.code,
    });
  }

  // Medications — active MedicationRequest with RxNorm coding.
  for (const m of entries.filter((r) => r.resourceType === 'MedicationRequest')) {
    if (m.status !== 'active') {
      warnings.push(`MedicationRequest ${m.id || '(no id)'} status=${m.status}; ignored (active only)`);
      continue;
    }
    const coding = codingDisplay(
      m.medicationCodeableConcept?.coding,
      RXNORM_SYSTEM,
    );
    if (!coding) {
      warnings.push(`MedicationRequest ${m.id || '(no id)'} has no RxNorm coding; ignored`);
      continue;
    }
    const key = MEDICATION_MAP[coding.code];
    attributes.medications.push({
      key: key || 'other',
      code: coding.code,
      system: RXNORM_SYSTEM,
      display: coding.display || 'unknown',
      status: 'active',
    });
    attributes.onMedication = true;
    if (!key) warnings.push(`Medication RxNorm ${coding.code} not in eligibility path map; kept as "other"`);
  }

  return { attributes, warnings };
}

/**
 * Reduce extracted attributes to the circuit-shaped tuple the Wave-3
 * attestation circuit consumes: attestWithAttributes(age: Uint<8>, cond: Boolean,
 * med: Boolean, holderSecret, nonce).
 */
export function toCircuitAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object') {
    throw new Error('fhir-import: attributes object required');
  }
  const { age, hasCondition, onMedication, sourceLabel } = attributes;
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 0 || age > 255) {
    throw new Error(`fhir-import: age must be an integer 0–255 (got ${String(age)})`);
  }
  if (typeof hasCondition !== 'boolean' || typeof onMedication !== 'boolean') {
    throw new Error('fhir-import: hasCondition and onMedication must be booleans');
  }
  if (sourceLabel !== 'SYNTHETIC') {
    throw new Error(`fhir-import: refusing non-synthetic source "${String(sourceLabel)}" — synthetic demo only`);
  }
  return { age, hasCondition, onMedication };
}

/**
 * Clean handoff into the attestation flow. The demo issuer + circuit wiring is
 * another worker's job: they register a handler via `setAttestationHandler(fn)`,
 * which receives (attributes, circuitTuple) and returns whatever the issuer
 * produces. Until then, the request is returned as `queued` — the attributes
 * are held in memory and nothing is transmitted.
 */
let attestationHandler = null;

export function setAttestationHandler(fn) {
  if (fn !== null && typeof fn !== 'function') {
    throw new Error('fhir-import: attestation handler must be a function or null');
  }
  attestationHandler = fn;
}

export function requestAttestation(attributes) {
  const circuitTuple = toCircuitAttributes(attributes);
  const request = {
    status: attestationHandler ? 'submitted' : 'queued',
    parserVersion: PARSER_VERSION,
    attributes,
    circuitTuple,
    note: attestationHandler
      ? 'handled by registered demo issuer'
      : 'no demo issuer registered yet — demo issuer + circuit wiring is a separate worker; attributes held in memory, nothing transmitted',
  };
  if (attestationHandler) {
    return attestationHandler(attributes, circuitTuple);
  }
  return request;
}
