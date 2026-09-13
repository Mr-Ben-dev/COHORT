import { COHORT_API_ORIGIN } from "@/lib/cohort-origin";

const PRIVATE_FIELD_NAMES = new Set([
  "age",
  "ageYears",
  "sex",
  "diagnosis",
  "condition",
  "medication",
  "fhir",
  "witness",
  "privateState",
  "secret",
  "blind",
  "seed",
  "mnemonic",
  "patient",
  "profile",
  "wAge",
  "wCondition",
  "wMedication",
  "wSecret",
  "wBlind",
]);

export function findPrivateFields(value: unknown, path = ""): string[] {
  const hits: string[] = [];
  const walk = (node: unknown, p: string) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${p}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const next = p ? `${p}.${k}` : k;
        if (PRIVATE_FIELD_NAMES.has(k)) hits.push(next);
        walk(v, next);
      }
    }
  };
  walk(value, path);
  return hits;
}

export async function proxyCohort(path: string, init?: RequestInit): Promise<Response> {
  const url = `${COHORT_API_ORIGIN}${path}`;
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  return res;
}
