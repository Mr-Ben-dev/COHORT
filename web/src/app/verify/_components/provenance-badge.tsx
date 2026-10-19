"use client";

export type BadgeProvenance = "live-onchain" | "sample-data";

const LIVE_CLASSES =
  "bg-emerald-50 text-emerald-800 border-emerald-300";
const SAMPLE_CLASSES =
  "bg-amber-50 text-amber-900 border-amber-300";

const LIVE_DOT = "bg-emerald-500";
const SAMPLE_DOT = "bg-amber-500";

export function ProvenanceBadge({
  provenance,
}: {
  provenance: BadgeProvenance;
}) {
  const live = provenance === "live-onchain";
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={live ? "badge-live-onchain" : "badge-sample-data"}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium tracking-wide ${
        live ? LIVE_CLASSES : SAMPLE_CLASSES
      }`}
    >
      <span
        aria-hidden
        className={`h-2.5 w-2.5 rounded-full ${live ? LIVE_DOT : SAMPLE_DOT}`}
      />
      {live ? "LIVE ON-CHAIN" : "SAMPLE DATA — connect backends to go live"}
    </span>
  );
}
