/**
 * Public circuit argument encoding. Trial ids are Bytes<32> ASCII, NUL-padded.
 */
export function encodeTrialId(trialId) {
  const text = String(trialId || '');
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0 || bytes.length > 32) {
    throw new Error('trialId must be 1..32 bytes');
  }
  const out = new Uint8Array(32);
  out.set(bytes);
  return out;
}

export function randomBytes32() {
  const out = new Uint8Array(32);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** Session-only LevelDB password. Never a committed secret; never derived from public keys. */
export function sessionStoragePassword() {
  const raw = new Uint8Array(24);
  globalThis.crypto.getRandomValues(raw);
  const hex = [...raw].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `Aa1!${hex}`;
}
