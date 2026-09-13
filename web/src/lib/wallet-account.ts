/**
 * Public-safe wallet identity for local namespaces.
 * Uses only connector-provided addresses. Never wallet secrets or medical facts.
 */

export function truncatePublicId(id: string): string {
  const value = String(id || "").trim();
  if (!value) return "";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function sanitizeNamespace(ns: unknown): string | null {
  if (typeof ns !== "string") return null;
  const cleaned = ns.toLowerCase().replace(/[^a-f0-9]/g, "");
  if (cleaned.length < 16 || cleaned.length > 64) return null;
  return cleaned.slice(0, 32);
}

export async function namespaceFromPublicId(rdns: string, publicId: string): Promise<string> {
  const material = `${String(rdns || "").slice(0, 120)}:${String(publicId || "").slice(0, 256)}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(buf).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function readPublicIdFromAddresses(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string" && payload.length > 8) return payload;
  if (typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  for (const key of ["shieldedAddress", "unshieldedAddress", "address"]) {
    const value = row[key];
    if (typeof value === "string" && value.length > 8) return value;
  }
  return null;
}
