import { PRIVATE_FIELD_NAMES } from '../apps/api/src/public-fields.mjs';

export function walkValues(value, visit, path = '$') {
  visit(value, path);
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkValues(item, visit, `${path}[${i}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkValues(v, visit, `${path}.${k}`);
  }
}

export function findForbiddenKeys(value) {
  const hits = [];
  const walk = (node, p) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const next = `${p}.${k}`;
      if (PRIVATE_FIELD_NAMES.includes(k)) hits.push(next);
      if (v && typeof v === 'object') walk(v, next);
    }
  };
  walk(value, '$');
  return hits;
}

export function findExactMarkers(value, markers) {
  const hits = [];
  walkValues(value, (node, path) => {
    if (typeof node === 'number' || typeof node === 'bigint') {
      for (const m of markers) {
        if (Number(node) === Number(m) && Number.isFinite(Number(m))) {
          hits.push({ path, marker: m, value: node });
        }
      }
    }
    if (typeof node === 'string') {
      for (const m of markers) {
        if (node === String(m)) hits.push({ path, marker: m, value: node });
      }
    }
  });
  return hits;
}

export function serializeNetwork(rec) {
  return {
    method: rec.method,
    url: rec.url,
    headers: rec.headers || {},
    body: rec.body ?? null,
  };
}
