import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/**
 * WordHighlight — the measured Impilo dashed box, now alive.
 * Impilo's rotating word sits in a spacious (20px 32px) dashed
 * rounded box whose stroke is drawn from the hero-word cyan at
 * ~70% presence — and the dashes march around the perimeter
 * (`.dash-march`), the "selected layer" meta-detail that makes
 * the word feel continuously interacted-with.
 */
export function WordHighlight({
  children,
  tone = "cyan",
  className,
}: {
  children: ReactNode;
  tone?: "cyan" | "lilac" | "ink" | "mint";
  className?: string;
}) {
  const dashColor: Record<string, string> = {
    cyan: "rgba(114, 230, 255, 0.75)",
    lilac: "rgba(177, 166, 246, 0.75)",
    ink: "rgba(35, 34, 101, 0.65)",
    mint: "rgba(92, 255, 177, 0.8)",
  };
  return (
    <span
      style={{ "--dash-color": dashColor[tone] } as CSSProperties}
      className={cn(
        "dash-march relative inline-block rounded-[18px]",
        "px-[26px] py-[8px] sm:px-8 sm:py-2.5",
        tone === "cyan" && "text-hero-word",
        tone === "lilac" && "text-lilac-mist",
        tone === "ink" && "text-iris-ink",
        tone === "mint" && "text-mint-vital",
        className,
      )}
    >
      {children}
    </span>
  );
}
