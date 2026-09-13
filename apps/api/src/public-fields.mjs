export const PRIVATE_FIELD_NAMES = Object.freeze([
  'age',
  'ageYears',
  'sex',
  'diagnosis',
  'condition',
  'medication',
  'fhir',
  'witness',
  'privateState',
  'secret',
  'blind',
  'seed',
  'mnemonic',
  'patient',
  'profile',
  'wAge',
  'wCondition',
  'wMedication',
  'wSecret',
  'wBlind',
]);

export function findPrivateFields(value, path = '') {
  const hits = [];
  const walk = (node, p) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${p}[${i}]`));
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const next = p ? `${p}.${k}` : k;
        if (PRIVATE_FIELD_NAMES.includes(k)) hits.push(next);
        walk(v, next);
      }
    }
  };
  walk(value, path);
  return hits;
}

export function assertPublicOnly(body) {
  const hits = findPrivateFields(body);
  if (hits.length) {
    const err = new Error('private fields are not accepted');
    err.status = 400;
    err.code = 'PRIVATE_FIELD_REJECTED';
    err.fields = hits;
    throw err;
  }
}

export const PUBLIC_REFERRAL_KEYS = new Set([
  'trialId',
  'commitment',
  'txHash',
  'contractAddress',
  'networkId',
  'nullifier',
]);
