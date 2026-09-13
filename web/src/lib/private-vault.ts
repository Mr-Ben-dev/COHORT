"use client";

import type { PrivateProfile } from "@/domain/types";
import {
  decryptJson,
  encryptJson,
  generateVaultKey,
  VAULT_CANARY,
} from "@/lib/vault-crypto";
import { sanitizeNamespace } from "@/lib/wallet-account";

const DB_NAME = "cohort-private-v1";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const DATA_STORE = "data";
const KEY_ID = "profile-aes";
const PROFILE_ID = "profile";
const CANARY_ID = "canary";
const PROOFS_ID = "public-proofs";
const ACTIVE_NS_ID = "active-ns";

export type PublicProofCacheEntry = {
  trialId: string;
  txHash?: string;
  txId?: string;
  publicRef: string;
  verifiedAt: string;
  network: string;
  referralStatus?: "none" | "commitment" | "shared";
};

let activeNs: string | null = null;

function asBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new Error("Stored ciphertext is not bytes.");
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
      if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed."));
  });
}

function idbGet<T>(store: string, id: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function idbPut(store: string, id: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbDelete(store: string, id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbClear(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction([KEY_STORE, DATA_STORE], "readwrite");
        tx.objectStore(KEY_STORE).clear();
        tx.objectStore(DATA_STORE).clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

let keyMemo: CryptoKey | null = null;

async function loadOrCreateKey(): Promise<CryptoKey> {
  if (keyMemo) return keyMemo;
  const stored = await idbGet<CryptoKey>(KEY_STORE, KEY_ID);
  if (stored) {
    keyMemo = stored;
    return stored;
  }
  const key = await generateVaultKey();
  await idbPut(KEY_STORE, KEY_ID, key);
  await idbPut(DATA_STORE, CANARY_ID, await encryptJson(key, VAULT_CANARY));
  keyMemo = key;
  return key;
}

function allowedProfile(profile: PrivateProfile): PrivateProfile {
  const next: PrivateProfile = {};
  if (typeof profile.age === "number" && Number.isFinite(profile.age)) next.age = profile.age;
  if (typeof profile.hasCondition === "boolean") next.hasCondition = profile.hasCondition;
  if (profile.medication === "yes" || profile.medication === "no") {
    next.medication = profile.medication;
  }
  if (typeof profile.typedSubsetAck === "boolean") next.typedSubsetAck = profile.typedSubsetAck;
  return next;
}

function profileRecordId(ns = activeNs): string {
  return ns ? `profile:${ns}` : PROFILE_ID;
}

function proofsRecordId(ns = activeNs): string {
  return ns ? `proofs:${ns}` : PROOFS_ID;
}

export function getVaultNamespace(): string | null {
  return activeNs;
}

export function setVaultNamespace(ns: string | null): void {
  activeNs = sanitizeNamespace(ns);
}

export async function persistActiveNamespace(ns: string | null): Promise<void> {
  const next = sanitizeNamespace(ns);
  activeNs = next;
  if (!next) {
    await idbDelete(DATA_STORE, ACTIVE_NS_ID);
    return;
  }
  await idbPut(DATA_STORE, ACTIVE_NS_ID, next);
}

export async function readActiveNamespace(): Promise<string | null> {
  try {
    const stored = await idbGet<unknown>(DATA_STORE, ACTIVE_NS_ID);
    const next = sanitizeNamespace(typeof stored === "string" ? stored : null);
    activeNs = next;
    return next;
  } catch {
    return activeNs;
  }
}

export async function migrateLegacyIfNeeded(ns: string): Promise<void> {
  const next = sanitizeNamespace(ns);
  if (!next) return;
  const namespacedProfile = await idbGet<unknown>(DATA_STORE, profileRecordId(next));
  const namespacedProofs = await idbGet<unknown>(DATA_STORE, proofsRecordId(next));
  if (!namespacedProfile) {
    const legacy = await idbGet<unknown>(DATA_STORE, PROFILE_ID);
    if (legacy) {
      await idbPut(DATA_STORE, profileRecordId(next), legacy);
      await idbDelete(DATA_STORE, PROFILE_ID);
    }
  }
  if (!namespacedProofs) {
    const legacy = await idbGet<unknown>(DATA_STORE, PROOFS_ID);
    if (legacy) {
      await idbPut(DATA_STORE, proofsRecordId(next), legacy);
      await idbDelete(DATA_STORE, PROOFS_ID);
    }
  }
}

export async function savePrivateProfile(profile: PrivateProfile): Promise<void> {
  const key = await loadOrCreateKey();
  const payload = allowedProfile(profile);
  await idbPut(DATA_STORE, profileRecordId(), await encryptJson(key, payload));
}

export async function loadPrivateProfile(): Promise<PrivateProfile | null> {
  try {
    const key = await loadOrCreateKey();
    const packed = await idbGet<unknown>(DATA_STORE, profileRecordId());
    if (!packed) return null;
    const profile = await decryptJson<PrivateProfile>(key, asBytes(packed));
    return allowedProfile(profile);
  } catch {
    return null;
  }
}

export async function savePublicProofs(entries: PublicProofCacheEntry[]): Promise<void> {
  const safe = entries.map((e) => ({
    trialId: String(e.trialId || "").slice(0, 32),
    txHash: e.txHash ? String(e.txHash).slice(0, 80) : undefined,
    txId: e.txId ? String(e.txId).slice(0, 80) : undefined,
    publicRef: String(e.publicRef || "").slice(0, 80),
    verifiedAt: String(e.verifiedAt || ""),
    network: String(e.network || "Midnight Preprod").slice(0, 40),
    referralStatus: e.referralStatus,
  }));
  await idbPut(DATA_STORE, proofsRecordId(), safe);
}

export async function loadPublicProofs(): Promise<PublicProofCacheEntry[]> {
  const rows = await idbGet<PublicProofCacheEntry[]>(DATA_STORE, proofsRecordId());
  return Array.isArray(rows) ? rows : [];
}

export async function clearCurrentNamespace(): Promise<void> {
  await idbDelete(DATA_STORE, profileRecordId());
  await idbDelete(DATA_STORE, proofsRecordId());
}

export async function clearPrivateVault(): Promise<void> {
  keyMemo = null;
  activeNs = null;
  await idbClear();
}

export function describeVault(): {
  encrypted: boolean;
  location: string;
  keyMaterial: string;
  unlock: string;
  ifCleared: string;
} {
  return {
    encrypted: true,
    location: "IndexedDB on this origin (cohort-private-v1)",
    keyMaterial:
      "A non-extractable AES-GCM CryptoKey stored in the same origin IndexedDB. Not a wallet seed and not a user passphrase.",
    unlock: "The profile unlocks automatically when this origin loads in the same browser profile.",
    ifCleared: "Clearing site data, cookies for this origin, or the IndexedDB database permanently deletes the profile.",
  };
}
