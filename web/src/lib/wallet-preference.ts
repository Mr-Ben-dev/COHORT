"use client";

/** Non-secret last-used wallet rdns. Never a seed, viewing key, or medical fact. */
const KEY = "cohort.wallet.rdns";

export function readPreferredRdns(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(KEY);
    if (!value || value.length > 120) return null;
    if (/[<>\s]/.test(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writePreferredRdns(rdns: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, rdns.slice(0, 120));
  } catch {
    /* quota / private mode */
  }
}

export function clearPreferredRdns(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
