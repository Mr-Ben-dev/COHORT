"use client";

import { ArrowLeft } from "lucide-react";
import { useCohortStore } from "@/state/cohort-store";
import { cn } from "@/lib/utils";

/** Product-view back link — follows the internal navigation history. */
export function BackLink({
  label = "Back",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const goBack = useCohortStore((s) => s.goBack);
  return (
    <button
      onClick={goBack}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 py-2.5 text-body-sm font-medium text-lilac-mist transition-colors hover:bg-cloud-white/5 hover:text-cloud-white",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
