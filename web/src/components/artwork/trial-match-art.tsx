"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * TrialMatchArt — line-art for the trial-matching step.
 * A magnifier hovering over trial criteria cards, in Lilac Mist strokes.
 */
export function TrialMatchArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      role="img"
      aria-label="Matching public trial criteria to your private profile."
      className={cn("h-auto w-full max-w-[200px] select-none", className)}
    >
      <motion.g
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Criteria cards */}
        <rect x="14" y="84" width="92" height="58" rx="12" fill="#4b48d8" stroke="var(--color-iris-border)" />
        <line x1="28" y1="104" x2="86" y2="104" stroke="var(--color-lilac-mist)" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <line x1="28" y1="118" x2="66" y2="118" stroke="var(--color-lilac-mist)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <circle cx="28" cy="132" r="3" fill="var(--color-clinical-cyan)" />
        <line x1="38" y1="132" x2="72" y2="132" stroke="var(--color-clinical-cyan)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />

        <rect x="64" y="52" width="92" height="58" rx="12" fill="#4b48d8" stroke="var(--color-iris-border)" strokeDasharray="5 5" />
        <line x1="78" y1="72" x2="136" y2="72" stroke="var(--color-lilac-mist)" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <line x1="78" y1="86" x2="116" y2="86" stroke="var(--color-lilac-mist)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <circle cx="78" cy="100" r="3" fill="var(--color-mint-vital)" />
        <line x1="88" y1="100" x2="120" y2="100" stroke="var(--color-mint-vital)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      </motion.g>

      {/* Magnifier */}
      <motion.g
        animate={reduce ? undefined : { y: [0, 5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <circle cx="142" cy="112" r="22" stroke="var(--color-clinical-cyan)" strokeWidth="3" />
        <line x1="158" y1="128" x2="176" y2="146" stroke="var(--color-clinical-cyan)" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 134 110 l 5 5 l 9 -10" stroke="var(--color-mint-vital)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}
