const SECRET_KEYS = /token|secret|password|seed|mnemonic|authorization|cookie|api[_-]?key/i;
const PRIVATE_KEYS = /age|diagnos|condition|medication|fhir|witness|blind|patient/i;

export function redact(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/ghp_|github_pat_|rnd_|vcp_|sk_live/i.test(value)) return '[REDACTED]';
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.test(k) || PRIVATE_KEYS.test(k)) out[k] = '[REDACTED]';
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}

export function publicLog(message, meta) {
  if (meta === undefined) {
    console.log(message);
    return;
  }
  console.log(message, JSON.stringify(redact(meta)));
}
