"use client";

import { cn } from "@/lib/utils";
import type { RecruitingStatus } from "@/domain/types";

/** Recruiting status pill — mint means "actively enrolling". */
export function StatusPill({
  status,
  className,
}: {
  status: RecruitingStatus;
  className?: string;
}) {
  const config: Record<RecruitingStatus, { label: string; cls: string; live: boolean }> = {
    recruiting: {
      label: "Recruiting",
      cls: "border-mint-vital/40 bg-mint-vital/10 text-mint-vital",
      live: true,
    },
    "not-yet-recruiting": {
      label: "Not yet recruiting",
      cls: "border-lilac-mist/35 bg-lilac-mist/10 text-lilac-mist",
      live: false,
    },
    "active-not-recruiting": {
      label: "Active, not recruiting",
      cls: "border-lilac-mist/35 bg-lilac-mist/10 text-lilac-mist",
      live: false,
    },
  };
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5 text-caption font-semibold",
        c.cls,
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full bg-current", c.live && "pulse-mint")}
        aria-hidden="true"
      />
      {c.label}
    </span>
  );
}

/** Small categorical tag (condition, phase, location…). */
export function Tag({
  children,
  tone = "violet",
  className,
}: {
  children: React.ReactNode;
  tone?: "violet" | "cyan" | "lilac" | "mint" | "light";
  className?: string;
}) {
  const tones = {
    violet: "border-iris-border/70 bg-iris-glow/25 text-pearl",
    cyan: "border-clinical-cyan/35 bg-clinical-cyan/10 text-clinical-cyan",
    lilac: "border-lilac-mist/30 bg-lilac-mist/10 text-lilac-mist",
    mint: "border-mint-vital/40 bg-mint-vital/10 text-mint-vital",
    light: "border-ash bg-deep-iris/5 text-deep-iris/75",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-caption font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
