"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * EmptyStateArt — quiet line-art for empty and no-result states.
 * A dashed aperture with a drifting document: nothing found, nothing lost.
 */
export function EmptyStateArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      role="img"
      aria-hidden="true"
      className={cn("h-auto w-full max-w-[220px] select-none", className)}
    >
      <motion.g
        animate={reduce ? undefined : { y: [0, -7, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 62px" }}
      >
        {/* Document */}
        <rect x="76" y="30" width="62" height="72" rx="10" fill="#4b48d8" stroke="var(--color-iris-border)" />
        <line x1="88" y1="48" x2="126" y2="48" stroke="var(--color-lilac-mist)" strokeWidth="3.4" strokeLinecap="round" opacity="0.75" />
        <line x1="88" y1="62" x2="118" y2="62" stroke="var(--color-lilac-mist)" strokeWidth="3.4" strokeLinecap="round" opacity="0.45" />
        <line x1="88" y1="76" x2="122" y2="76" stroke="var(--color-lilac-mist)" strokeWidth="3.4" strokeLinecap="round" opacity="0.45" />
        <circle cx="107" cy="92" r="5" stroke="var(--color-clinical-cyan)" strokeWidth="1.8" />
        <path d="M 104.5 92 l 2 2.2 l 3.8 -4" stroke="var(--color-clinical-cyan)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Dashed aperture */}
      <ellipse cx="100" cy="112" rx="66" ry="12" stroke="var(--color-lilac-mist)" strokeWidth="1.4" strokeDasharray="5 7" opacity="0.7" />

      {/* Sparkles */}
      <circle cx="42" cy="36" r="2" fill="var(--color-lilac-mist)" opacity="0.8" />
      <circle cx="164" cy="26" r="2.4" fill="var(--color-lilac-mist)" opacity="0.7" />
      <path d="M 156 60 h 9 M 160.5 55.5 v 9" stroke="var(--color-lilac-mist)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
