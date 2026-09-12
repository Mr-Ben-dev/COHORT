import { cn } from "@/lib/utils";

/**
 * COHORT logo — a "cohort ring": an arc of participant nodes with one
 * mint verification node. Original geometry, drawn for this product.
 * Wordmark set lowercase in the Impilo brand-voice style.
 */
export function CohortMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="COHORT"
      className={cn("h-8 w-8", className)}
      style={{ filter: "drop-shadow(0 2px 6px rgba(22,22,88,0.35))" }}
    >
      {/* Participant arc — leaves a gap at the lower-right for the proof node */}
      <path
        d="M 20 5.5 A 14.5 14.5 0 1 1 7.6 12.4"
        stroke="var(--color-lilac-mist)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Mint ECG pulse bridging the ring gap (impilo wordmark signature) */}
      <path
        d="M 8.9 11.6 L 10.6 10.6 L 10.4 6.2 L 15.9 10 L 16.1 6.4 L 19.2 5.8"
        stroke="var(--color-mint-vital)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cohort nodes along the arc */}
      <circle cx="20" cy="5.5" r="2.6" fill="var(--color-cloud-white)" />
      <circle cx="34.5" cy="20" r="2.6" fill="var(--color-lilac-mist)" />
      <circle cx="7.6" cy="12.4" r="2.6" fill="var(--color-lilac-mist)" />
      <circle cx="9.2" cy="30.8" r="2.6" fill="var(--color-lilac-mist)" />
      {/* Verification node — the proof that completes the cohort.
       * Carries a soft mint bloom so it reads as the "live" element. */}
      <circle cx="27.4" cy="32.4" r="9" fill="var(--color-mint-vital)" opacity="0.16" />
      <circle cx="27.4" cy="32.4" r="5.4" fill="var(--color-mint-vital)" style={{ filter: "drop-shadow(0 0 4px rgba(92,255,177,0.55))" }} />
      <path
        d="M 24.9 32.4 l 1.8 1.8 l 3.2 -3.4"
        stroke="var(--color-iris-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CohortLogo({
  className,
  wordmark = true,
  compact = false,
}: {
  className?: string;
  wordmark?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CohortMark className={compact ? "h-7 w-7" : "h-9 w-9"} />
      {wordmark && (
        <span
          className={cn(
            "font-semibold text-cloud-white",
            compact ? "text-[17px]" : "text-[20px]",
          )}
          style={{ letterSpacing: "0.04em" }}
        >
          cohort
        </span>
      )}
    </span>
  );
}
