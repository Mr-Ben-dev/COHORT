#!/usr/bin/env node
/**
 * ctgov-extract.mjs — human-verified extraction helper for COHORT trial mapping.
 *
 * Usage: node scripts/ctgov-extract.mjs NCT07153614
 *
 * 1. Fetches https://clinicaltrials.gov/api/v2/studies/<NCT>
 * 2. Saves the raw JSON to data/ctgov/<NCT>.json (audit-trail snapshot, committed)
 * 3. Prints a human-readable extraction worksheet (age/sex/conditions/status +
 *    the VERBATIM raw eligibilityCriteria text) to guide hand-mapping.
 *
 * No NLP parsing: mapping to the typed schema in apps/api/src/trials.mjs is
 * done by a human from this worksheet, with verbatim provenance per predicate.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CTGOV_STUDY_URL = 'https://clinicaltrials.gov/api/v2/studies';

function line(text = '') {
  process.stdout.write(`${text}\n`);
}

function section(title) {
  line('');
  line('='.repeat(72));
  line(title);
  line('='.repeat(72));
}

async function main() {
  const nctId = process.argv[2];
  if (!nctId || !/^NCT[0-9]{8}$/.test(nctId)) {
    console.error('usage: node scripts/ctgov-extract.mjs <NCT_ID>   (e.g. NCT07153614)');
    process.exit(2);
  }

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataDir = path.join(root, 'data', 'ctgov');
  mkdirSync(dataDir, { recursive: true });

  const url = `${CTGOV_STUDY_URL}/${encodeURIComponent(nctId)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    });
  } catch (err) {
    console.error(`ERROR: fetch failed for ${nctId}: ${err.message}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`ERROR: ClinicalTrials.gov returned ${res.status} for ${nctId}`);
    process.exit(1);
  }
  const raw = await res.json();

  const snapPath = path.join(dataDir, `${nctId}.json`);
  writeFileSync(snapPath, `${JSON.stringify(raw, null, 2)}\n`);
  line(`[snapshot] saved raw JSON -> ${path.relative(root, snapPath)}`);

  const protocol = raw?.protocolSection || {};
  const ident = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const conds = protocol.conditionsModule || {};
  const elig = protocol.eligibilityModule || {};
  const sponsor = protocol.sponsorCollaboratorsModule?.leadSponsor?.name
    || ident.organization?.fullName
    || '(unknown)';
  const meshes = protocol.derivedSection?.conditionBrowseModule?.meshes || [];

  section(`WORKSHEET — ${nctId}`);
  line(`Brief title : ${ident.briefTitle || '(none)'}`);
  line(`Official    : ${(ident.officialTitle || '').slice(0, 120)}`);
  line(`Lead sponsor: ${sponsor}`);
  line(`Status      : ${status.overallStatus || '(unknown)'}`);
  line(`Phases      : ${Array.isArray(design.phases) ? design.phases.join(', ') : '(none)'}`);
  line(`Study type  : ${design.studyType || '(unknown)'}`);

  section('CONDITIONS (typed source for requireCondition)');
  for (const c of (conds.conditions || []).slice(0, 12)) line(`  - ${c}`);
  line('MeSH terms:');
  for (const m of meshes.slice(0, 12)) line(`  - ${m.term || ''} [${m.id || ''}]`);

  section('TYPED ELIGIBILITY FIELDS');
  line(`minimumAge        : ${elig.minimumAge ?? '(missing)'}`);
  line(`maximumAge        : ${elig.maximumAge ?? '(missing)'}`);
  line(`sex               : ${elig.sex ?? '(missing)'}`);
  line(`healthyVolunteers : ${String(elig.healthyVolunteers ?? '(missing)')}`);
  line(`NOTE: the typed key is "healthyVolunteers" (BOOLEAN), not "acceptsHealthyVolunteers".`);

  section('ELIGIBILITY CRITERIA — VERBATIM RAW TEXT (copy exact sentences as provenance)');
  const criteria = elig.eligibilityCriteria || '(no eligibilityCriteria text in record)';
  line(criteria);

  section('MAPPING PROMPT');
  line('Map to the typed schema in apps/api/src/trials.mjs (TRIAL_MAPPINGS entry):');
  line('  requireCondition  -> sponsor-typed condition flag; cite verbatim sentence(s)');
  line('  forbidMedication  -> excluded-medication flag; cite verbatim sentence(s)');
  line('  provenance        -> VERBATIM raw criterion sentence(s) per predicate');
  line('  unsupported       -> every criterion you explicitly did NOT map ("proven on N of M")');
  line('');
  line('URL: https://clinicaltrials.gov/study/' + nctId);
}

main();
