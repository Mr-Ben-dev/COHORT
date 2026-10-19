/** Hand-mapped flags only. Free-text eligibility is never executed as Compact and never LLM-mapped. */
export const TRIAL_MAPPINGS = Object.freeze({
  NCT07153614: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Listed surgical oncology indication (sponsor-mapped flag)',
    medicationLabel: 'Chronic opioid / excluded med flag',
    mapping: 'hand-mapped typed subset; free-text criteria are not in the circuit',
    unsupportedCriteria: 'pregnancy, language, incision type, anticoagulants, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition: 'Patients undergoing open surgery for foregut, HPB, and colorectal cancer',
      forbidMedication: 'Chronic Opioid Use (received an opioid within 90 days preoperatively)',
    }),
    unsupported: Object.freeze([
      'pregnancy test / pregnant or breastfeeding',
      'English speaking requirement',
      'midline incision requirement',
      'anticoagulant use <7 days prior to surgery',
      'recreational drug use',
      'cognitive impairment affecting consent',
      'adjuvant chemotherapy recommendation',
      'AM admit procedure',
      'nerve block contraindications',
      'admission prior to surgery for malignancy complications',
    ]),
  }),
  NCT04200963: Object.freeze({
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'Locally advanced or metastatic solid tumor (sponsor-mapped flag)',
    medicationLabel: null,
    mapping: 'hand-mapped typed subset; ECOG/QTc/washouts are not in the circuit',
    unsupportedCriteria: 'ECOG, QTc, washouts, CNS mets, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Patients with confirmed solid tumors (including urothelial carcinoma) who have locally recurrent or metastatic disease that has progressed on or following all standard of care therapies or who is not a candidate for standard treatment.',
      forbidMedication: null,
    }),
    unsupported: Object.freeze([
      'ECOG performance status 0 to 1',
      'washout periods for prior therapies (cytotoxic, biologic, small molecule, investigational)',
      'CNS metastases criteria',
      'adequate organ function',
      'measurable disease',
      'tumor biopsy requirements',
      'highly effective birth control',
      'active autoimmune disease',
      'corticosteroids / immunosuppressive medications',
      'concurrent antineoplastic treatment',
      'HIV / hepatitis B / C / tuberculosis',
      'unrecovered adverse events from prior therapies',
    ]),
  }),
  NCT06304857: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Invasive breast cancer stage I-III with planned anthracycline treatment (sponsor-mapped flag)',
    medicationLabel: 'SGLT2 inhibitors, semaglutide, liraglutide, metformin excluded-medication flag',
    mapping: 'hand-mapped typed subset; cardiac, metabolic, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'heart failure history, LVEF<50%, arrhythmia, stroke, BMI>40, diabetes/glucose thresholds, pregnancy, eGFR, liver/kidney failure, infections, anemia, life expectancy, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        "Diagnosis of invasive breast cancer \\[stage I-III\\] and planned anthracycline treatment within 60 days.",
      forbidMedication:
        'Taking another study drug or drugs from the group of SGLT2 inhibitors up to 6 months before the screening visit. | Taking semaglutide, liraglutide and metformin during the 30 days preceding the screening visit.',
    }),
    unsupported: Object.freeze([
      'heart failure history or undiagnosed heart failure symptoms',
      'left ventricular ejection fraction < 50%',
      'severe valvular heart disease',
      'history of clinically significant arrhythmia',
      'history of stroke',
      'cardiomyopathy',
      'pulmonary hypertension',
      'uncontrolled arterial pressure or systolic pressure < 80 mmHg',
      'BMI > 40 kg/m2',
      'diagnosed type 1 or type 2 diabetes or fasting glucose >= 126 mg/dl or HbA1C >= 6.5%',
      'pregnancy or breastfeeding / contraception',
      'eGFR < 25 ml/min/1.73m2',
      'life expectancy < 12 months or stage IV cancer',
      'transaminases above 2.5x local norm',
      'anemia with hemoglobin < 9 g/dl',
      'kidney failure > G2',
      'liver disorders, Child-Pugh score > 4',
      'active HIV / HBV / HCV / tuberculosis',
      'urinary tract infection requiring antibiotics 48h before anthracycline',
      'epirubicin or liposomal doxorubicin treatment within 12 months',
    ]),
  }),
  NCT06165419: Object.freeze({
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'Metastatic solid tumor with spine involvement (sponsor-mapped flag)',
    medicationLabel: null,
    mapping: 'hand-mapped typed subset; ECOG, SINS, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'ECOG, SINS, vertebral-body limits, neurologic function, radiosensitive tumors, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Any pathologically proven solid tumor diagnosis not of central nervous system origin with radiographic or pathologic evidence of metastatic disease | Metastatic spine involvement documented by imaging',
      forbidMedication: null,
    }),
    unsupported: Object.freeze([
      'involvement of maximum 3 contiguous vertebral bodies',
      'neurologic function / muscle strength criteria',
      'evaluation by radiation oncology and spine/neurosurgery attending',
      'ECOG Performance Status of 0-3',
      'Spinal Instability Neoplastic Score (SINS) > 12',
      'previous surgery or radiation to the target spinal metastases',
      'radiosensitive tumors (small cell lung cancer, lymphoma, multiple myeloma, germ-cell tumors)',
    ]),
  }),
  NCT06296745: Object.freeze({
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'NSCLC with EGFR mutation and leptomeningeal metastasis (sponsor-mapped flag)',
    medicationLabel: null,
    mapping: 'hand-mapped typed subset; prior TKI progression, labs, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'prior TKI progression, liver/kidney function, WBC/platelet counts, nervous system criteria, compliance, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Histologically or cytologically confirmed diagnosis of NSCLC with single activating EGFR mutations (L858R or Exon19Del). | Confirmed diagnosis of leptomeningeal metastasis according to ESMO/ EANO guidelines.',
      forbidMedication: null,
    }),
    unsupported: Object.freeze([
      'progression after previous double doses of third-generation TKIs such as Osimertinib',
      'normal liver and kidney function',
      'WBC >= 4000/mm3, Plt >= 100000/mm3',
      'no history of severe nervous system disease',
      'no severe dyscrasia',
      'nervous system failure criteria (encephalopathy, leukoencephalopathy, Glasgow Coma Score < 11)',
      'extensive and lethal progressive systemic diseases',
      'patient compliance / suitability',
    ]),
  }),
  NCT06643819: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Hypertension on antihypertensive therapy (sponsor-mapped flag; implied by medication criterion)',
    medicationLabel: 'Other clinical trial drugs excluded-medication flag',
    mapping: 'hand-mapped typed subset; hypertension is implied by the antihypertensive-medication criterion, not stated as an inclusion line',
    unsupportedCriteria:
      'secondary hypertension, orthostatic hypotension, diabetes status, drug/alcohol abuse, pregnancy/contraception, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Participants who require combination administration of antihypertensive drugs other than clinical trial drugs during the clinical trial participation period.',
      forbidMedication: 'Participants who treated other clinical trial drugs within 4 weeks of screening visit.',
    }),
    unsupported: Object.freeze([
      'history of secondary hypertension or suspected secondary hypertension',
      'orthostatic hypotension',
      'type 1 diabetes or poorly controlled diabetes',
      'history of drug or alcohol abuse within 24 weeks of screening',
      'pregnant women, lactating women, or lack of contraception agreement',
      'investigator discretion on ability to participate',
    ]),
  }),
  NCT06804122: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Pulmonary arterial hypertension, WHO functional class II-III (sponsor-mapped flag)',
    medicationLabel: 'PAH medication stability required / changes excluded flag',
    mapping: 'hand-mapped typed subset; residency, functional, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'Tampere residency, exercise commitment, syncope, cardiac/liver/anemia exclusions, blood pressure, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'WHO functional classification II-III. | Stable disease condition with no PAH medication changes in the two months prior.',
      forbidMedication: 'Changes in PAH medication during the rehabilitation program.',
    }),
    unsupported: Object.freeze([
      'residence in Tampere or nearby municipalities',
      'commitment to the exercise program',
      'no recent syncope or symptomatic arrhythmias within the past two months',
      'severe pulmonary disease or left ventricular failure (HFrEF)',
      'pregnancy',
      'severe congenital heart defect (Eisenmenger syndrome)',
      'severe liver disease',
      'acute inflammatory condition',
      'severe anemia',
      'systolic blood pressure below 85 mmHg',
      'other significant conditions affecting physical capacity',
      'untreated severe arrhythmias',
    ]),
  }),
  NCT04977076: Object.freeze({
    requireCondition: true,
    forbidMedication: false,
    conditionLabel: 'Atrial fibrillation on DOAC undergoing elective ICA or PCI (sponsor-mapped flag)',
    medicationLabel: null,
    mapping: 'hand-mapped typed subset; bleeding-risk, renal, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'acute coronary syndrome, creatinine clearance, bleeding-risk history, anemia, pregnancy, liver disease, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition: "Patients aged \\>18 years using DOAC and undergoing elective ICA or PCI.",
      forbidMedication: null,
    }),
    unsupported: Object.freeze([
      'acute coronary syndrome (STEMI, NSTEMI, UA) at presentation',
      'calculated creatinine clearance < 30 mL/min',
      'history or condition associated with increased bleeding risk',
      'major surgical procedure within 30 days before the procedure',
      'history of GI bleeding in the previous 6 months',
      'history of intracranial, intraocular, spinal, or atraumatic intra-articular bleeding',
      'chronic bleeding disorder',
      'intracranial neoplasm, arteriovenous malformation, or aneurysm',
      'anemia with hemoglobin < 6 mmol/L',
      'current pregnancy or breast-feeding',
      'significant liver disease or ALT > 3x upper limit of normal',
      'participation in another clinical trial',
    ]),
  }),
  NCT06976619: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Type 1 or type 2 diabetes treated with insulin (sponsor-mapped flag)',
    medicationLabel: 'GLP-1 receptor agonist excluded-medication flag',
    mapping: 'hand-mapped typed subset; HbA1c, surgical history, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'HbA1c threshold, pregnancy, prior upper abdominal surgery, systemic illness/malignancy, vascular disease, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition: 'Type 1 or type 2 diabetes treated with insulin',
      forbidMedication: 'Prior use of GLP-1 receptor agonists in the previous year.',
    }),
    unsupported: Object.freeze([
      'HbA1c > 10.0%',
      'positive pregnancy test at enrollment',
      'prior upper abdominal surgery (adjustable gastric banding, pyloroplasty, vagotomy)',
      'active systemic illness or malignancy',
      'symptomatic macrovascular or microvascular disease',
    ]),
  }),
  NCT07233434: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'At risk for type 2 diabetes (HbA1c 5.7-6.4% plus risk factors; pre-diabetic screening population)',
    medicationLabel: 'Glucose/insulin-metabolism-affecting treatment excluded flag',
    mapping: 'hand-mapped typed subset; origin, consent, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'age bounds, African/Indian origin, FBG level, consent/social-health-system, pregnancy, gestational diabetes, PCOS, endocrine/hepatic/renal disease, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        "HbA1c levels between 5.7 and 6.4%" + ' | ' + "One or more of the following factors: BMI \\> 25 kg/m2, family history of T2DM in the 1st and 2nd familial degree, hypertension, dyslipidemia",
      forbidMedication: 'Treatment that affect the metabolism of glucose or insulin',
    }),
    unsupported: Object.freeze([
      'age over 18 and under 65 years',
      'African or Indian origin and self-declared',
      'normal FBG levels (110 mg/dL)',
      'affiliation to the national social health system or equivalent',
      'informed and written consent',
      'pregnant or lactating woman',
      'history of gestational diabetes',
      'polycystic ovary syndrome',
      'endocrine, hepatic or renal diseases affecting glycemic control',
      'participation in another research study',
      'impaired decisional abilities / guardianship',
      'severely impaired physical and/or psychological health',
    ]),
  }),
  NCT04516057: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Major neurocognitive disorder due to Alzheimer disease with clinically significant agitation (sponsor-mapped flag)',
    medicationLabel: 'Psychotropic medication change excluded flag',
    mapping: 'hand-mapped typed subset; sMMSE, caregiver, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'sMMSE threshold, cognitive-enhancing medication stability, caregiver availability, cardiovascular/liver/psychiatric exclusions, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Diagnostic and Statistical Manual of Mental Disorders-5 (DSM 5) criteria for Major Neurocognitive Disorder due to AD. | Presence of clinically significant agitation based on the IPA definition',
      forbidMedication:
        'Change in psychotropic medications less than 1 week prior to study randomization (e.g., concomitant antidepressants)',
    }),
    unsupported: Object.freeze([
      'sMMSE <= 24',
      'cognitive-enhancing medications (cholinesterase inhibitors and/or memantine) stable for at least 3 months',
      'availability of a primary caregiver proficient in English',
      'contraindications to cannabinoids / clinically important drug-drug interactions',
      'current uncontrolled cardiovascular disease',
      'current significant liver disease',
      'other psychiatric disorders or neurological conditions (psychotic disorders, schizophrenia, stroke, epilepsy)',
      'current major depressive episode',
      'previous or current abuse of/dependence on marijuana',
      'clinically significant delusions and/or hallucinations',
      'recreational use of marijuana or cannabis products within 3 months',
      'females must be post-menopausal',
    ]),
  }),
  NCT05565833: Object.freeze({
    requireCondition: true,
    forbidMedication: true,
    conditionLabel: 'Insomnia with cognitive impairment (sponsor-mapped flag)',
    medicationLabel: 'Opioid / stimulating-medication excluded flag',
    mapping: 'hand-mapped typed subset; age, language, internet, and free-text criteria are not in the circuit',
    unsupportedCriteria:
      'English language, US residency, internet access, insomnia distress/impairment, psychiatric exclusions, other sleep disorders, and free-text inclusion/exclusion are not proven',
    provenance: Object.freeze({
      requireCondition:
        'Sleep-onset insomnia and/or sleep maintenance insomnia symptoms | Cognitive impairment through study assessment.',
      forbidMedication:
        'Chronic pain treated with opioids | Use of stimulating medications after 5pm or taken for less than 3 months',
    }),
    unsupported: Object.freeze([
      'able to speak and read English, and is a US resident',
      'access to an Internet-enabled device and willingness to be emailed',
      'sleep disturbance or daytime fatigue causing significant distress or impairment over the past three months',
      'stable medication regimen unless medication is known to cause insomnia',
      'current psychological treatment for insomnia',
      'initiation of psychological or psychiatric treatment within the past three months',
      'current diagnosis of Huntington or Parkinson disease',
      'current treatment for hyperthyroidism',
      'currently undergoing chemotherapy',
      'asthma or respiratory concerns with night treatment',
      'not recovered from a brain tumor, injury, or infection',
      'epilepsy without stable treatment for at least 3 months',
      'irregular sleep schedule',
      'psychotic or bipolar disorder',
      'moderate to high risk of suicide',
      'alcohol or drug abuse within the past year',
      'other untreated sleep disorders (e.g., obstructive sleep apnea)',
      'severe depression on study screen',
    ]),
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
  const sponsor =
    protocol.sponsorCollaboratorsModule?.leadSponsor?.name ||
    ident.organization?.fullName ||
    'ClinicalTrials.gov record';
  const phases = protocol.designModule?.phases;
  const phaseRaw = Array.isArray(phases) && typeof phases[0] === 'string' ? phases[0] : null;
  const phase = phaseRaw ? phaseRaw.replace(/_/g, ' ') : 'See study record';
  const brief = protocol.descriptionModule?.briefSummary || protocol.descriptionModule?.detailedDescription || '';
  const loc = protocol.contactsLocationsModule?.locations?.[0];
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
    sponsor,
    phase,
    summary: typeof brief === 'string' && brief.trim() ? brief.trim().slice(0, 480) : mapping.mapping,
    location: loc
      ? {
          city: loc.city || '',
          region: loc.state || loc.country || '',
          country: loc.country || '',
          remote: false,
        }
      : null,
    source: `https://clinicaltrials.gov/study/${nctId}`,
    mapping: mapping.mapping,
    unsupportedCriteria: mapping.unsupportedCriteria,
    provenance: mapping.provenance ?? {},
    unsupported: mapping.unsupported ?? [],
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
