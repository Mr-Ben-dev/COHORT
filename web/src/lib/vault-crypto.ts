/**
 * Origin-scoped AES-GCM for the local private profile.
 * Key is a non-extractable CryptoKey. This is not a user passphrase.
 * Same-origin XSS can still read IndexedDB; clearing site data destroys the vault.
 */

export const VAULT_CANARY = "cohort-vault-v1";

export async function generateVaultKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable. The private profile cannot be stored.");
  }
  return globalThis.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const out = new Uint8Array(iv.byteLength + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.byteLength);
  return out;
}

export async function decryptBytes(key: CryptoKey, packed: Uint8Array): Promise<Uint8Array> {
  if (packed.byteLength < 13) throw new Error("Ciphertext is too short.");
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const plain = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new Uint8Array(plain);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return encryptBytes(key, encoded);
}

export async function decryptJson<T>(key: CryptoKey, packed: Uint8Array): Promise<T> {
  const plain = await decryptBytes(key, packed);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
