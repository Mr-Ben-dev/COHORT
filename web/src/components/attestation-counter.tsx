"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * AttestationCounter — public proof-of-execution counter (SQUAD C4).
 *
 * Reads the Wave-3 ledger `attestationsVerified` counter through
 * GET /api/attestation-counters (same-origin, no wallet required) and
 * renders it as a light, clinical proof band:
 *   · live        → "<N> attestations verified on-chain" + green LIVE ON-CHAIN badge
 *   · not-deployed→ amber "NOT DEPLOYED YET — counter goes live on Wave-3 deploy"
 *                     badge and NO number (the Wave-3 contract is undeployed,
 *                     so there is no on-chain number to show — never invent one)
 *   · loading     → honest "reading chain…" skeleton
 *   · error       → "couldn't reach the counter API" + retry
 */

// __COUNTER_LOGIC_START__
// NOTE: everything between __COUNTER_LOGIC_START__ and __COUNTER_LOGIC_END__
// is plain JavaScript with no TypeScript-only syntax — TESTS/attestation-counter.test.mjs
// extracts and evaluates this block verbatim against a mocked fetch.

/**
 * Expected API payload (GET /api/attestation-counters, A7):
 *   { attestationsVerified: number | null, source: "live" | "not-deployed" }
 * "live"         — the counter is reading the deployed Wave-3 contract ledger.
 * "not-deployed" — the Wave-3 contract is not deployed yet; attestationsVerified is null.
 */
function parseCounterPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("counter API returned an unexpected response");
  }
  var rawCount =
    payload.attestationsVerified !== undefined
      ? payload.attestationsVerified
      : payload.count;
  if (
    payload.source === "live" &&
    typeof rawCount === "number" &&
    Number.isFinite(rawCount) &&
    rawCount >= 0
  ) {
    return { status: "live", count: Math.floor(rawCount) };
  }
  if (rawCount === null || rawCount === undefined) {
    // Honest fallback: no number was received, so none is rendered.
    // The Wave-3 contract is undeployed — this is "not deployed yet",
    // not a zero.
    return { status: "not-deployed", count: null };
  }
  throw new Error("counter API returned an unexpected response");
}

/** Format a received counter value for display (grouped thousands). */
function formatCounter(count) {
  if (typeof count !== "number" || !Number.isFinite(count)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.floor(count));
}

/** Badge copy + tone for a resolved counter status. */
function counterBadge(status) {
  if (status === "live") {
    return { label: "LIVE ON-CHAIN", tone: "live" };
  }
  return {
    label: "NOT DEPLOYED YET — counter goes live on Wave-3 deploy",
    tone: "pending",
  };
}

/**
 * Fetch the counter (same-origin, no wallet). Resolves to
 * { status: "live" | "not-deployed", count: number | null }.
 * Rejects on network failure, non-2xx, or an unexpected payload shape.
 */
async function loadAttestationCounter(fetchImpl) {
  var res = await fetchImpl("/api/attestation-counters", {
    cache: "no-store",
  });
  if (!res || !res.ok) {
    throw new Error("couldn't reach the counter API");
  }
  return parseCounterPayload(await res.json());
}
// __COUNTER_LOGIC_END__

/** @typedef {{ status: "loading" | "live" | "not-deployed" | "error", count: number | null }} CounterView */

const BADGE_STYLES = {
  live: "border-emerald-600/25 bg-emerald-50 text-emerald-700",
  pending: "border-amber-600/25 bg-amber-50 text-amber-800",
};

function StatusBadge({ status }) {
  var badge = counterBadge(status === "live" ? "live" : "pending");
  var tone = status === "live" ? "live" : "pending";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.14em]",
        BADGE_STYLES[tone],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "live" ? "animate-pulse bg-emerald-500" : "bg-amber-500",
        )}
      />
      {badge.label}
    </span>
  );
}

/**
 * Light clinical proof band. Self-contained: fetches on mount, renders
 * loading / live / not-deployed / error states, never a number it did
 * not receive.
 */
export function AttestationCounter({ className }) {
  /** @type {[CounterView, Function]} */
  var state = useState({ status: "loading", count: null });
  var view = state[0];
  var setView = state[1];

  var refresh = useCallback(function () {
    setView({ status: "loading", count: null });
    loadAttestationCounter(fetch).then(
      function (result) {
        setView(result);
      },
      function () {
        setView({ status: "error", count: null });
      },
    );
  }, []);

  useEffect(function () {
    var cancelled = false;
    loadAttestationCounter(fetch).then(
      function (result) {
        if (!cancelled) setView(result);
      },
      function () {
        if (!cancelled) setView({ status: "error", count: null });
      },
    );
    return function () {
      cancelled = true;
    };
  }, []);

  return (
    <section
      aria-label="On-chain attestation counter"
      aria-live="polite"
      className={cn("w-full bg-pearl", className)}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 py-10 text-center sm:px-8">
        {view.status === "loading" && (
          <>
            <div
              aria-hidden="true"
              className="h-7 w-44 animate-pulse rounded-full bg-ash/70"
            />
            <p className="text-body-sm text-fog">reading chain…</p>
          </>
        )}

        {view.status === "live" && (
          <>
            <StatusBadge status="live" />
            <p className="text-iris-ink">
              <span className="block text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
                {formatCounter(view.count)}
              </span>
              <span className="mt-2 block text-body-sm text-fog">
                attestations verified on-chain
              </span>
            </p>
          </>
        )}

        {view.status === "not-deployed" && (
          <>
            <StatusBadge status="not-deployed" />
            <p className="max-w-xl text-body-sm text-fog">
              The <code className="font-mono text-iris-ink">attestationsVerified</code>{" "}
              ledger counter ships with the Wave-3 contract, which hasn&apos;t
              been deployed yet. This counter starts reading on-chain data on
              deploy — no number is shown until then.
            </p>
          </>
        )}

        {view.status === "error" && (
          <>
            <p className="text-body-sm text-iris-ink">
              couldn&apos;t reach the counter API.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-iris-ink/25 bg-cloud-white px-5 py-2 text-caption font-semibold uppercase tracking-[0.14em] text-iris-ink transition-colors hover:border-iris-ink/50"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}
