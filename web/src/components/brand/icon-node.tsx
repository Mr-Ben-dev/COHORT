"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Small icon container using the 7px node radius token. */
export function IconNode({
  children,
  tone = "lilac",
  className,
}: {
  children: ReactNode;
  tone?: "lilac" | "cyan" | "mint" | "light";
  className?: string;
}) {
  const tones = {
    lilac: "bg-lilac-mist/10 text-lilac-mist border border-lilac-mist/25",
    cyan: "bg-clinical-cyan/10 text-clinical-cyan border border-clinical-cyan/30",
    mint: "bg-mint-vital/10 text-mint-vital border border-mint-vital/30",
    light: "bg-deep-iris/5 text-deep-iris border border-ash",
  } as const;
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-node",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
