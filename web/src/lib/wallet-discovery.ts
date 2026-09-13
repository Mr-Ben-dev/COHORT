"use client";

/**
 * CAIP-372 / DApp Connector v4 discovery.
 * Scan window.midnight; never hardcode a single implementation as the only wallet.
 * Icons render through <img>, never innerHTML. SVG data URLs are rejected.
 */

export type DiscoveredWallet = {
  injectKey: string;
  rdns: string;
  name: string;
  iconSrc: string | null;
  apiVersion: string;
  kind: "1AM" | "Lace" | "other";
  compatible: boolean;
  canProveInBrowser: boolean;
};

type InjectedWallet = {
  rdns?: string;
  name?: string;
  icon?: string;
  apiVersion?: string;
  connect?: (networkId: string) => Promise<unknown>;
  getProvingProvider?: unknown;
};

const SUPPORTED_MAJOR = 4;

export function midnightGlobal(): Record<string, InjectedWallet> | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { midnight?: Record<string, InjectedWallet> };
  return w.midnight && typeof w.midnight === "object" ? w.midnight : null;
}

export function sanitizeWalletName(name: unknown): string {
  if (typeof name !== "string") return "Midnight wallet";
  return name.replace(/[<>]/g, "").slice(0, 80) || "Midnight wallet";
}

/** Only http(s) and raster data URLs. Never SVG (XSS). */
export function sanitizeWalletIcon(icon: unknown): string | null {
  if (typeof icon !== "string" || icon.length > 200_000) return null;
  if (icon.startsWith("https://") || icon.startsWith("http://")) return icon;
  if (
    icon.startsWith("data:image/png") ||
    icon.startsWith("data:image/jpeg") ||
    icon.startsWith("data:image/jpg") ||
    icon.startsWith("data:image/webp") ||
    icon.startsWith("data:image/gif")
  ) {
    return icon;
  }
  return null;
}

export function apiVersionCompatible(apiVersion: unknown): boolean {
  if (typeof apiVersion !== "string") return false;
  const major = Number.parseInt(apiVersion.split(".")[0] || "", 10);
  return major === SUPPORTED_MAJOR;
}

export function classifyWallet(injectKey: string, rdns: string, name: string): DiscoveredWallet["kind"] {
  const hay = `${injectKey} ${rdns} ${name}`.toLowerCase();
  if (injectKey === "1am" || hay.includes("1am") || hay.includes("com.midnight.1am")) return "1AM";
  if (injectKey === "mnLace" || hay.includes("lace") || hay.includes("io.lace")) return "Lace";
  return "other";
}

export function discoverWallets(): DiscoveredWallet[] {
  const midnight = midnightGlobal();
  if (!midnight) return [];
  const out: DiscoveredWallet[] = [];
  const seen = new Set<string>();
  for (const [injectKey, api] of Object.entries(midnight)) {
    if (!api || typeof api !== "object") continue;
    if (typeof api.connect !== "function") continue;
    const rdns = typeof api.rdns === "string" && api.rdns ? api.rdns : injectKey;
    const name = sanitizeWalletName(api.name || injectKey);
    const kind = classifyWallet(injectKey, rdns, name);
    const id = `${rdns}:${injectKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      injectKey,
      rdns,
      name,
      iconSrc: sanitizeWalletIcon(api.icon),
      apiVersion: typeof api.apiVersion === "string" ? api.apiVersion : "unknown",
      kind,
      compatible: apiVersionCompatible(api.apiVersion),
      canProveInBrowser: typeof api.getProvingProvider === "function",
    });
  }
  return out.sort((a, b) => {
    const rank = (k: DiscoveredWallet["kind"]) => (k === "1AM" ? 0 : k === "Lace" ? 1 : 2);
    return rank(a.kind) - rank(b.kind);
  });
}

export function findInjected(kind: "1AM" | "Lace"): InjectedWallet | null {
  const midnight = midnightGlobal();
  if (!midnight) return null;
  if (kind === "1AM") {
    return (
      midnight["1am"] ||
      Object.values(midnight).find((api) => classifyWallet("", String(api?.rdns || ""), String(api?.name || "")) === "1AM") ||
      null
    );
  }
  return (
    midnight.mnLace ||
    Object.values(midnight).find((api) => classifyWallet("", String(api?.rdns || ""), String(api?.name || "")) === "Lace") ||
    null
  );
}

export function isOneAmInjected(): boolean {
  const w = findInjected("1AM");
  return Boolean(w && typeof w.connect === "function");
}

export function isLaceInjected(): boolean {
  const w = findInjected("Lace");
  return Boolean(w && typeof w.connect === "function");
}
