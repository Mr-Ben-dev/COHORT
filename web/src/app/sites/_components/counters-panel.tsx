"use client";

import { ProvenanceBadge, type BadgeProvenance } from "./provenance-badge";
import { Skeleton } from "@/components/ui/skeleton";

export type CounterSet = {
  proven: number;
  attestationCount: number;
  attestationsVerified: number;
  referralCount: number;
};

const COUNTER_ROWS: {
  key: keyof CounterSet;
  label: string;
  plain: string;
}[] = [
  {
    key: "proven",
    label: "Eligibility proofs accepted",
    plain:
      "Private proofs that a person qualifies for a trial — accepted by the contract without revealing any health facts.",
  },
  {
    key: "attestationCount",
    label: "Issuer attestations published",
    plain:
      "Attestation fingerprints published on chain by issuers (clinics). The record itself never appears on chain.",
  },
  {
    key: "attestationsVerified",
    label: "Attestations verified on chain",
    plain:
      "Successful attested proofs: the contract confirmed the attestation fingerprint and the eligibility rules held.",
  },
  {
    key: "referralCount",
    label: "Referral records",
    plain:
      "One-way fingerprints of eligibility referrals. They cannot be linked back to a person.",
  },
];

/**
 * Global contract counters with honest provenance.
 *
 * - loading: skeleton blocks, never zeros that look like real counts.
 * - live: chain numbers under the green badge.
 * - sample: clearly-labeled layout placeholders under the amber badge —
 *   the panel says so in words, not just color.
 * - error: the error message; no numbers rendered at all when the read
 *   failed (no numbers that weren't received).
 */
export function CountersPanel({
  stage,
  provenance,
  counters,
  isSample,
  error,
  fetchedAt,
}: {
  stage: "idle" | "loading" | "ready" | "error";
  provenance: BadgeProvenance | null;
  counters: CounterSet | null;
  isSample: boolean;
  error: string | null;
  fetchedAt: string | null;
}) {
  if (stage === "idle") {
    return (
      <p className="text-sm leading-relaxed text-[#7c7c9e]">
        Enter a trial ID above to read its counters. No wallet, no sign-in —
        this page only ever reads public contract state.
      </p>
    );
  }

  if (stage === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <Skeleton className="h-8 w-56 rounded-full bg-[#e3e3f5]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COUNTER_ROWS.map((row) => (
            <Skeleton key={row.key} className="h-24 rounded-xl bg-[#e3e3f5]" />
          ))}
        </div>
        <p className="text-sm text-[#7c7c9e]">Reading public counters…</p>
      </div>
    );
  }

  if (stage === "error" || !counters || !provenance) {
    return (
      <p className="text-sm leading-relaxed text-[#7c7c9e]">
        {error ?? "Counters could not be read."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ProvenanceBadge provenance={provenance} />
        {isSample && (
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#7c7c9e]">
            placeholder numbers for layout
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COUNTER_ROWS.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-[#d6d6f0] bg-white p-4"
          >
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {counters[row.key].toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-sm font-medium">{row.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#7c7c9e]">
              {row.plain}
            </p>
          </div>
        ))}
      </div>
      {isSample && (
        <p className="text-xs leading-relaxed text-amber-900">
          These numbers are layout placeholders, not chain state. They are
          shown so you can see where the real counters will appear once the
          backends are configured.
        </p>
      )}
      {fetchedAt && (
        <p className="text-xs text-[#7c7c9e]">
          Last read:{" "}
          <time dateTime={fetchedAt}>
            {new Date(fetchedAt).toLocaleString("en-GB")}
          </time>
        </p>
      )}
    </div>
  );
}
