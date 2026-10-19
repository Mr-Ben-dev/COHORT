"use client";

/**
 * COHORT — /sites operator console (client).
 *
 * A site operator pastes a trial ID and reads public counters — no wallet,
 * no sign-in, same-origin fetches only:
 *   1. /api/trials/{id}        — resolves the trial (title, sponsor, phase).
 *   2. /api/public-state       — global on-chain counters + public event log.
 *   3. /api/attestation-counters — attestation counters (A7; 404 today).
 *
 * Provenance semantics are SHARED with web/src/lib/cohort-verify.mjs
 * (C2's no-wallet module): we import classifyProvenance, PROVENANCE_LIVE,
 * and SAMPLE_COUNTERS so the green/amber rule and the placeholder numbers
 * are identical to the /verify judge page. The rule is all-or-nothing: any
 * failed endpoint, any non-live source, or any non-numeric counter demotes
 * the whole result to "sample-data" — live-looking numbers are never
 * blended with placeholders.
 *
 * This page reads /api/public-state itself (instead of calling
 * fetchVerifyState) because it also needs the response's `events` array
 * for the per-trial event log. Everything it classifies goes through the
 * shared rule above — no local re-invention of it.
 *
 * SEAM (do not "fix" locally — flag to A7/C2): apps/api's /api/public-state
 * reports source "blockfrost-preprod" on a successful chain read, but
 * cohort-verify.mjs only treats the exact string "live-onchain" as live.
 * Until A7 and C2 agree on that string, this console will honestly show
 * SAMPLE DATA even when the backend has real chain numbers.
 */
import { useCallback, useState } from "react";
import {
  classifyProvenance,
  PROVENANCE_LIVE,
  PROVENANCE_SAMPLE,
  SAMPLE_COUNTERS,
} from "@/lib/cohort-verify.mjs";
import { CountersPanel, type CounterSet } from "./counters-panel";
import { TrialEvents, type PublicEvent } from "./trial-events";
import { AttestationExplainer } from "./attestation-explainer";
import type { BadgeProvenance } from "./provenance-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Stage = "idle" | "loading" | "ready" | "error";

type TrialInfo = {
  trialId: string;
  title: string;
  sponsor: string;
  phase: string;
};

type ConsoleResult = {
  trial: TrialInfo;
  provenance: BadgeProvenance;
  counters: CounterSet;
  isSample: boolean;
  source: string | null;
  networkId: string | null;
  contractAddress: string | null;
  events: PublicEvent[];
  logAvailable: boolean;
  error: string | null;
  fetchedAt: string;
};

function toCounter(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store" });
  } catch (err) {
    throw new Error(
      `could not reach ${path}: ${err instanceof Error ? err.message : "network error"}`,
    );
  }
  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error ?? "")
        : "";
    throw new Error(
      `${path} returned HTTP ${res.status}${detail ? ` (${detail})` : ""}`,
    );
  }
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
}

async function loadConsole(trialId: string): Promise<ConsoleResult> {
  const fetchedAt = new Date().toISOString();

  // 1 — resolve the trial.
  const trialBody = await readJson(
    `/api/trials/${encodeURIComponent(trialId)}`,
  ).catch((err: Error) => {
    throw new Error(
      `Trial lookup failed: ${err.message}. Check the trial ID — e.g. an NCT number.`,
    );
  });
  const trial: TrialInfo = {
    trialId: String(trialBody.trialId ?? trialId),
    title: String(trialBody.title ?? trialId),
    sponsor: String(trialBody.sponsor ?? "not reported"),
    phase: String(trialBody.phase ?? "not reported"),
  };

  // 2+3 — counters. All-or-nothing, same rule as the /verify page.
  const [psSettled, acSettled] = await Promise.allSettled([
    readJson("/api/public-state"),
    readJson("/api/attestation-counters"),
  ]);

  const ps = psSettled.status === "fulfilled" ? psSettled.value : null;
  const ac = acSettled.status === "fulfilled" ? acSettled.value : null;

  const sample = (error: string): ConsoleResult => ({
    trial,
    provenance: PROVENANCE_SAMPLE,
    counters: { ...SAMPLE_COUNTERS },
    isSample: true,
    source: typeof ps?.source === "string" ? ps.source : null,
    networkId: typeof ps?.networkId === "string" ? ps.networkId : null,
    contractAddress:
      typeof ps?.contractAddress === "string" ? ps.contractAddress : null,
    events: [],
    logAvailable: ps !== null,
    error,
    fetchedAt,
  });

  if (!ps) {
    return sample(
      `Public state could not be read (${psSettled.status === "rejected" ? String((psSettled as PromiseRejectedResult).reason) : "unknown"}). Showing sample numbers for layout only.`,
    );
  }
  if (!ac) {
    return sample(
      `Attestation counters could not be read (${String((acSettled as PromiseRejectedResult).reason)}). Showing sample numbers for layout only.`,
    );
  }

  const source = (ps.source ?? ac.source) as string | null;
  if (classifyProvenance(source) !== PROVENANCE_LIVE) {
    const why =
      typeof source === "string" && source.length
        ? `backend reported source "${source}" (not the live source)`
        : "backend did not report a live source";
    return sample(`${why}. Showing sample numbers for layout only.`);
  }

  const proven = toCounter(ps.proven);
  const referralCount = toCounter(ps.referralCount);
  const attestationCount = toCounter(
    (ac.attestationCount ?? ac.attestations) as unknown,
  );
  const attestationsVerified = toCounter(
    (ac.attestationsVerified ?? ac.verifiedCount) as unknown,
  );

  if (
    proven === null ||
    referralCount === null ||
    attestationCount === null ||
    attestationsVerified === null
  ) {
    return sample(
      "Backend reported a live source but a counter was missing or not a number. Showing sample numbers for layout only.",
    );
  }

  const eventsRaw = Array.isArray(ps.events) ? ps.events : [];
  const events = (eventsRaw as PublicEvent[]).filter(
    (e) => e && typeof e === "object" && e.trialId === trial.trialId,
  );

  return {
    trial,
    provenance: PROVENANCE_LIVE,
    counters: { proven, attestationCount, attestationsVerified, referralCount },
    isSample: false,
    source: typeof source === "string" ? source : null,
    networkId: typeof ps.networkId === "string" ? ps.networkId : null,
    contractAddress:
      typeof ps.contractAddress === "string" ? ps.contractAddress : null,
    events,
    logAvailable: true,
    error: null,
    fetchedAt,
  };
}

export function SiteConsole() {
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ConsoleResult | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const lookup = useCallback(
    async (rawId: string) => {
      const trialId = rawId.trim();
      if (!trialId) return;
      setStage("loading");
      setTopError(null);
      try {
        const r = await loadConsole(trialId);
        setResult(r);
        setStage("ready");
      } catch (err) {
        setResult(null);
        setTopError(err instanceof Error ? err.message : String(err));
        setStage("error");
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    if (result) lookup(result.trial.trialId);
  }, [lookup, result]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      {/* ── Header ─────────────────────────────────────────── */}
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#7c7c9e]">
        COHORT · Site operator console
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
        Your trial&apos;s proof activity
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4a4a6e]">
        Paste a trial ID to see its on-chain proof counters — no wallet, no
        sign-in, nothing to install. The badge tells you exactly what the
        numbers are: green means they came from the live chain; amber means
        you&apos;re looking at placeholder numbers while the backends connect.
      </p>

      {/* ── Trial ID form ──────────────────────────────────── */}
      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(input);
        }}
      >
        <div className="grid w-full flex-1 gap-1.5">
          <Label htmlFor="trial-id">Trial ID</Label>
          <Input
            id="trial-id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. NCT04267848"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button
          type="submit"
          disabled={stage === "loading" || input.trim().length === 0}
        >
          {stage === "loading" ? "Reading…" : "Load trial"}
        </Button>
      </form>

      {/* ── Errors ─────────────────────────────────────────── */}
      {stage === "error" && topError && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Couldn&apos;t load the console</AlertTitle>
          <AlertDescription>{topError}</AlertDescription>
        </Alert>
      )}
      {stage === "ready" && result?.isSample && result.error && (
        <Alert className="mt-6 border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle>Counters are not live yet</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      {/* ── Trial header ───────────────────────────────────── */}
      {stage === "ready" && result && (
        <div className="mt-8 rounded-xl border border-[#d6d6f0] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7c7c9e]">
                {result.trial.trialId}
              </p>
              <h2 className="mt-1 text-xl font-medium leading-snug">
                {result.trial.title}
              </h2>
              <p className="mt-1 text-sm text-[#7c7c9e]">
                {result.trial.sponsor} · {result.trial.phase}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </div>
          {(result.contractAddress || result.networkId) && (
            <p className="mt-3 font-mono text-xs text-[#7c7c9e]">
              contract {result.contractAddress ?? "—"}
              {result.networkId ? ` · ${result.networkId}` : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Counters ───────────────────────────────────────── */}
      <section aria-label="Proof counters" className="mt-8">
        <CountersPanel
          stage={stage === "ready" ? "ready" : stage}
          provenance={result?.provenance ?? null}
          counters={result?.counters ?? null}
          isSample={result?.isSample ?? false}
          error={result?.error ?? null}
          fetchedAt={result?.fetchedAt ?? null}
        />
      </section>

      {/* ── Per-trial events ───────────────────────────────── */}
      <section aria-label="Trial proof events" className="mt-8">
        <TrialEvents
          stage={stage === "ready" ? "ready" : stage}
          trialId={result?.trial.trialId ?? ""}
          events={result?.events ?? []}
          logAvailable={result?.logAvailable ?? false}
        />
      </section>

      {/* ── Explainer ──────────────────────────────────────── */}
      <section aria-label="What a verified attestation means" className="mt-10">
        <AttestationExplainer />
      </section>

      <footer className="mt-10 border-t border-[#d6d6f0] pt-4">
        <p className="text-xs leading-relaxed text-[#7c7c9e]">
          This page reads public contract state only. It never asks for a
          wallet, never handles medical records, and never shows a number it
          didn&apos;t receive.
        </p>
      </footer>
    </div>
  );
}
