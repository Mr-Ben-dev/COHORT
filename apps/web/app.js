const state = {
  trials: [],
  selectedTrialId: null,
  wallet: null,
  apiName: null,
};

function status(msg, kind = '') {
  const el = document.getElementById('status');
  el.className = kind;
  el.textContent = msg;
}

function privateFacts() {
  const age = document.getElementById('age').value;
  const condition = document.getElementById('condition').value;
  const medication = document.getElementById('medication').value;
  return {
    age: age === '' ? null : Number(age),
    condition: condition === '' ? null : condition === 'true',
    medication: medication === '' ? null : medication === 'true',
  };
}

function selectedTrial() {
  return state.trials.find((t) => t.trialId === state.selectedTrialId) || null;
}

function localPredicate(trial, facts) {
  if (!trial || facts.age == null || facts.condition == null || facts.medication == null) {
    return { ok: false, reason: 'complete private facts first' };
  }
  if (facts.age < trial.minAge) return { ok: false, reason: 'below public minimum age' };
  if (facts.age > trial.maxAge) return { ok: false, reason: 'above public maximum age' };
  if (trial.requireCondition && !facts.condition) return { ok: false, reason: 'required condition absent' };
  if (trial.forbidMedication && facts.medication) return { ok: false, reason: 'forbidden medication present' };
  return { ok: true, reason: 'local predicate matches public policy (not a chain proof)' };
}

async function loadTrials() {
  const res = await fetch('/api/trials');
  const data = await res.json();
  state.trials = data.trials || [];
  const root = document.getElementById('trials');
  root.innerHTML = '';
  for (const trial of state.trials) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.textContent = `${trial.trialId} — ${trial.title} (ages ${trial.minAge}–${trial.maxAge})`;
    btn.addEventListener('click', () => {
      state.selectedTrialId = trial.trialId;
      status(`Selected public trial ${trial.trialId}. Private facts stay in this page.`);
    });
    root.appendChild(btn);
  }
  if (state.trials[0]) state.selectedTrialId = state.trials[0].trialId;
}

function parseFhirLocally() {
  const raw = document.getElementById('fhir').value.trim();
  if (!raw) {
    status('No FHIR on this page.', 'warn');
    return;
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    status('FHIR JSON is invalid. Nothing was sent.', 'bad');
    return;
  }
  const birth = doc.birthDate || doc.entry?.[0]?.resource?.birthDate;
  if (birth) {
    const y = new Date(birth).getUTCFullYear();
    const age = new Date().getUTCFullYear() - y;
    document.getElementById('age').value = String(age);
  }
  status('FHIR parsed in the browser only. The COHORT server did not receive it.', 'ok');
}

function midnightApis() {
  const root = window.midnight;
  if (!root) return [];
  return Object.keys(root).map((name) => ({ name, api: root[name] }));
}

async function connectWallet() {
  const apis = midnightApis();
  if (!apis.length) {
    status(
      'No Midnight DApp Connector found. Install 1AM (preferred: in-browser proving) or Lace with a local proof-server. COHORT will not generate a fake transaction.',
      'warn',
    );
    return;
  }
  const preferred = apis.find((a) => a.name === '1am') || apis[0];
  const enabled = await preferred.api.enable();
  state.wallet = enabled;
  state.apiName = preferred.name;
  const proving = typeof enabled.getProvingProvider === 'function';
  status(
    `Connected ${preferred.name}. In-browser proving: ${proving ? 'yes' : 'no — Lace requires a user-local proof-server, never a COHORT proof-server'}.`,
    proving ? 'ok' : 'warn',
  );
}

function freshBlind() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function prove() {
  const trial = selectedTrial();
  const facts = privateFacts();
  const preview = localPredicate(trial, facts);
  if (!preview.ok) {
    status(`Not proven locally: ${preview.reason}. No network submit of private facts.`, 'bad');
    return;
  }
  if (!state.wallet) {
    status('Connect a Midnight wallet first. Private facts were not sent anywhere.', 'warn');
    return;
  }
  const provider = state.wallet.getProvingProvider;
  if (typeof provider !== 'function') {
    status(
      'This wallet has no getProvingProvider. Use 1AM, or run Lace with a proof-server on YOUR machine. COHORT will not proxy witnesses to Render.',
      'bad',
    );
    return;
  }
  const config = await (await fetch('/api/config')).json();
  if (!config.contractAddress) {
    status(
      'Local predicate matched, but no public-testnet contract address is configured. Wallet proving was not started, and private facts were not posted.',
      'warn',
    );
    return;
  }
  freshBlind();
  status(
    `Wallet proving would run in ${state.apiName} with a fresh blind. The COHORT server only accepts public {trialId, commitment, txHash}. Private facts stay in wallet memory.`,
    'ok',
  );
}

document.getElementById('parse-fhir').addEventListener('click', parseFhirLocally);
document.getElementById('connect').addEventListener('click', () => connectWallet().catch((e) => status(String(e.message || e), 'bad')));
document.getElementById('prove').addEventListener('click', () => prove().catch((e) => status(String(e.message || e), 'bad')));
loadTrials().catch((e) => status(String(e.message || e), 'bad'));
