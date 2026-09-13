import assert from 'node:assert/strict';
import { findExactMarkers, findForbiddenKeys } from './inspect.mjs';

/** Dump origin storage without expanding ciphertext bytes (byte 31 is not age 31). */
export async function dumpOriginPrivacy(page) {
  return page.evaluate(async () => {
    const asSafe = (row) => {
      if (row instanceof ArrayBuffer) return { bytes: row.byteLength };
      if (ArrayBuffer.isView(row)) return { bytes: row.byteLength };
      if (row && typeof row === 'object' && 'algorithm' in row && 'type' in row) {
        return { cryptoKey: true };
      }
      try {
        return JSON.parse(JSON.stringify(row));
      } catch {
        return { type: typeof row };
      }
    };

    const idb = {};
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const meta of dbs) {
        if (!meta.name) continue;
        idb[meta.name] = await new Promise((resolve) => {
          const open = indexedDB.open(meta.name);
          open.onerror = () => resolve({ error: 'open-failed' });
          open.onsuccess = () => {
            const db = open.result;
            const names = [...db.objectStoreNames];
            const out = {};
            if (!names.length) {
              db.close();
              resolve(out);
              return;
            }
            const tx = db.transaction(names, 'readonly');
            let pending = names.length;
            const done = () => {
              pending -= 1;
              if (pending <= 0) {
                db.close();
                resolve(out);
              }
            };
            for (const storeName of names) {
              const req = tx.objectStore(storeName).getAll();
              req.onsuccess = () => {
                out[storeName] = (req.result || []).map(asSafe);
                done();
              };
              req.onerror = () => {
                out[storeName] = { error: 'read-failed' };
                done();
              };
            }
          };
        });
      }
    }

    const cachesDump = {};
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        cachesDump[key] = (await cache.keys()).map((r) => r.url);
      }
    }

    const workers = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    return {
      href: location.href,
      cookies: document.cookie,
      local: { ...localStorage },
      session: { ...sessionStorage },
      idb,
      caches: cachesDump,
      serviceWorkers: workers.map((w) => w.scope),
    };
  });
}

export function assertNoPrivateFactsInOrigin(snapshot, markers) {
  const parsed = {
    href: snapshot.href,
    cookies: snapshot.cookies,
    local: snapshot.local,
    session: snapshot.session,
    idb: snapshot.idb,
    caches: snapshot.caches,
    serviceWorkers: snapshot.serviceWorkers,
  };
  assert.equal(findForbiddenKeys(parsed.local).length, 0, 'localStorage private keys');
  assert.equal(findForbiddenKeys(parsed.session).length, 0, 'sessionStorage private keys');
  assert.equal(findExactMarkers(parsed, markers).length, 0, JSON.stringify(findExactMarkers(parsed, markers)));
  for (const marker of markers) {
    assert.equal(String(parsed.href).includes(String(marker)), false);
    assert.equal(String(parsed.cookies).includes(String(marker)), false);
  }
}
