import { CohortDapp, ErrorCode } from './cohort-dapp.js';

const state = {
  trials: [],
  selectedTrialId: null,
  wallet: null,
  apiName: null,
  config: null,
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

async function loadPublicChain() {
  const res = await fetch('/api/config');
  const config = await res.json();
  state.config = config;
  const el = document.getElementById('chain-status');
  if (!config.contractAddress) {
    el.textContent = `Network ${config.networkId}. No public contract address yet.`;
    return;
  }
  el.textContent = `Network ${config.networkId}. Public contract ${config.contractAddress}. Querying indexer…`;
  if (!config.indexerUrl) return;
  const gql = await fetch(config.indexerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query($address: HexEncoded!) { contractAction(address: $address) { __typename ... on ContractDeploy { address } ... on ContractCall { address entryPoint } ... on ContractUpdate { address } } }',
      variables: { address: config.contractAddress },
    }),
  });
  const body = await gql.json();
  const action = body.data?.contractAction;
  if (!action) {
    el.textContent = `Network ${config.networkId}. Contract ${config.contractAddress} not visible on the indexer yet.`;
    return;
  }
  el.textContent = `Network ${config.networkId}. Indexer sees ${action.__typename} at ${action.address || config.contractAddress}${action.entryPoint ? ` (${action.entryPoint})` : ''}.`;
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
  const preferred =
    apis.find((a) => a.name === '1am' || a.api?.rdns === 'com.midnight.1am' || a.api?.name === '1AM') ||
    apis.find((a) => typeof a.api?.connect === 'function') ||
    apis[0];
  const networkId = state.config?.networkId || 'preprod';
  if (typeof preferred.api.connect !== 'function') {
    status('Wallet connector has no connect(). COHORT will not generate a fake transaction.', 'bad');
    return;
  }
  // connect() must start in this click turn. An extra await before it drops the user gesture.
  status('Connecting 1AM via connect(preprod)… approve the wallet popup.', '');
  const pending = preferred.api.connect(networkId);
  const enabled = await pending;
  state.wallet = enabled;
  state.apiName = preferred.api?.name || preferred.name;
  const proving = typeof enabled.getProvingProvider === 'function';
  if (!proving) {
    status(
      'Connected wallet does not expose getProvingProvider. Use 1AM, or run Lace with a proof-server on YOUR machine. COHORT will not generate a fake transaction.',
      'bad',
    );
    return;
  }
  let dustLabel = 'unknown';
  if (typeof enabled.getDustBalance === 'function') {
    try {
      const dust = await enabled.getDustBalance();
      dustLabel = dust?.balance != null ? String(dust.balance) : 'unknown';
    } catch {
      dustLabel = 'unavailable';
    }
  }
  status(
    `Connected ${state.apiName}. In-browser proving: yes. DUST: ${dustLabel}.`,
    'ok',
  );
}

function freshBlind() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function prove() {
  const trial = selectedTrial();
  const facts = { ...privateFacts(), blind: freshBlind() };
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
  const config = state.config || (await (await fetch('/api/config')).json());
  state.config = config;
  if (!config.contractAddress) {
    status(
      'Local predicate matched, but no public-testnet contract address is configured. Wallet proving was not started, and private facts were not posted.',
      'warn',
    );
    return;
  }
  status(
    `Proving in ${state.apiName} via getProvingProvider (in-browser WASM). Private facts stay in this page. First proof can take a minute.`,
    'warn',
  );
  let result;
  try {
    result = await CohortDapp.proveEligibility({
      wallet: { api: state.wallet },
      trial,
      facts,
      origin: window.location.origin,
      networkId: config.networkId || 'preprod',
      indexerUrl: config.indexerUrl,
      indexerWsUrl: config.indexerWsUrl,
      contractAddress: config.contractAddress,
      postPublicReferral: true,
    });
  } catch (err) {
    const code = err?.code || ErrorCode.PROVING_FAILED;
    status(`${code}: ${err?.publicMessage || err?.message || err}. COHORT will not generate a fake transaction.`, 'bad');
    return;
  }
  if (!result?.txId && !result?.txHash) {
    status('submitCallTx returned no identifier. COHORT will not generate a fake transaction.', 'bad');
    return;
  }
  status(
    `Submitted on Midnight. txId=${result.txId || 'n/a'} txHash=${result.txHash || 'n/a'} proven=${result.proven ?? 'pending indexer'}. The COHORT server only received public {trialId, txHash, contractAddress, networkId}.`,
    'ok',
  );
}

document.getElementById('parse-fhir').addEventListener('click', parseFhirLocally);
document.getElementById('connect').addEventListener('click', () => {
  connectWallet().catch((e) => {
    const raw = String(e?.message || e);
    if (/request failed|receiving end|background/i.test(raw)) {
      status(
        '1AM did not answer. Click the 1AM icon in the Chrome toolbar to wake it, then Connect again. COHORT will not generate a fake transaction.',
        'bad',
      );
      return;
    }
    status(raw, 'bad');
  });
});
document.getElementById('prove').addEventListener('click', () => prove().catch((e) => status(String(e.message || e), 'bad')));
loadTrials().catch((e) => status(String(e.message || e), 'bad'));
loadPublicChain().catch((e) => status(String(e.message || e), 'bad'));
