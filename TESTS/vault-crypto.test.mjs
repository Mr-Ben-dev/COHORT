import test from 'node:test';
import assert from 'node:assert/strict';

async function generateKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const out = new Uint8Array(iv.byteLength + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.byteLength);
  return out;
}

async function decryptJson(key, packed) {
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

test('vault crypto round-trips a typed profile without embedding plaintext JSON', async () => {
  const key = await generateKey();
  const packed = await encryptJson(key, { age: 31, hasCondition: true, medication: 'no' });
  const utf8 = Buffer.from(packed).toString('utf8');
  assert.equal(utf8.includes('"age":31'), false);
  assert.equal(utf8.includes('hasCondition'), false);
  const out = await decryptJson(key, packed);
  assert.deepEqual(out, { age: 31, hasCondition: true, medication: 'no' });
});
