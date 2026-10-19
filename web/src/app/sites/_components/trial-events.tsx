"use client";

import { Skeleton } from "@/components/ui/skeleton";

export type PublicEvent = {
  trialId?: string;
  commitment?: string | null;
  txHash?: string | null;
  nullifier?: string | null;
  networkId?: string | null;
  receivedAt?: string;
};

function shortHash(h: string | null | undefined): string {
  if (!h) return "—";
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}

/**
 * Per-trial proof events from the server's public event log.
 *
 * Honesty note, rendered on screen: these entries are relayed receipts in
 * the server's public log (most recent 50), not on-chain counts. A green
 * badge on the counters panel does not turn this log into chain state.
 * No txHash yet on an entry simply means the receipt was logged before
 * the transaction anchored — it says nothing about the proof's validity.
 */
export function TrialEvents({
  stage,
  trialId,
  events,
  logAvailable,
}: {
  stage: "idle" | "loading" | "ready" | "error";
  trialId: string;
  events: PublicEvent[];
  logAvailable: boolean;
}) {
  if (stage === "idle") return null;

  if (stage === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <Skeleton className="h-6 w-64 rounded bg-[#e3e3f5]" />
        <Skeleton className="h-16 rounded-xl bg-[#e3e3f5]" />
      </div>
    );
  }

  if (stage === "error" || !logAvailable) {
    return (
      <p className="text-sm leading-relaxed text-[#7c7c9e]">
        The public event log is unavailable right now, so per-trial activity
        cannot be shown. The contract counters above are unaffected.
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[#d6d6f0] bg-white p-4">
        <p className="text-sm font-medium">No proof events for {trialId} yet</p>
        <p className="mt-1 text-xs leading-relaxed text-[#7c7c9e]">
          The server&apos;s public event log (most recent 50 entries) contains
          no receipts for this trial. This says nothing about the chain —
          check the provenance badge above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {events.length} proof {events.length === 1 ? "event" : "events"} for{" "}
        {trialId}
      </p>
      <ul className="divide-y divide-[#e8e8f7] rounded-xl border border-[#d6d6f0] bg-white">
        {events.map((e, i) => (
          <li key={`${e.receivedAt ?? i}-${i}`} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm tabular-nums">
                {e.receivedAt
                  ? new Date(e.receivedAt).toLocaleString("en-GB")
                  : "time unknown"}
              </p>
              <p className="font-mono text-xs text-[#7c7c9e]">
                tx {shortHash(e.txHash)}
              </p>
            </div>
            <p className="mt-1 font-mono text-xs text-[#7c7c9e]">
              commitment {shortHash(e.commitment)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-[#7c7c9e]">
        From the server&apos;s public event log (most recent 50 entries).
        These are relayed receipts, not on-chain counts.
      </p>
    </div>
  );
}
