"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * MidnightGlyph — original decorative artwork for the Midnight section.
 * Two orbits: the inner orbit holds private facts (never published), the
 * outer orbit carries publicly verifiable proofs. Not a logo clone —
 * COHORT's own geometry.
 */
export function MidnightGlyph({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      role="img"
      aria-label="Midnight keeps the inner orbit of facts private while the outer orbit of proofs is publicly verifiable."
      className={cn("h-auto w-full max-w-[320px] font-sans select-none", className)}
    >
      {/* Star field */}
      <g opacity="0.75">
        <circle cx="52" cy="60" r="1.5" fill="var(--color-lilac-mist)" />
        <circle cx="270" cy="44" r="1.8" fill="var(--color-cloud-white)" opacity="0.6" />
        <circle cx="296" cy="150" r="1.3" fill="var(--color-lilac-mist)" />
        <circle cx="240" cy="284" r="1.6" fill="var(--color-lilac-mist)" />
        <circle cx="70" cy="252" r="1.3" fill="var(--color-clinical-cyan)" opacity="0.6" />
        <path d="M 96 40 h 10 M 101 35 v 10" stroke="var(--color-lilac-mist)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Outer orbit — publicly verifiable */}
      <motion.g
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "160px 160px" }}
      >
        <circle cx="160" cy="160" r="128" stroke="var(--color-clinical-cyan)" strokeWidth="1.4" strokeDasharray="3 10" opacity="0.8" />
        {/* Proof nodes riding the public orbit */}
        <circle cx="160" cy="32" r="5" fill="#4b48d8" stroke="var(--color-clinical-cyan)" strokeWidth="1.6" />
        <path d="M 157 32 l 2 2.4 l 4 -4.4" stroke="var(--color-clinical-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="271" cy="224" r="4" fill="#4b48d8" stroke="var(--color-clinical-cyan)" strokeWidth="1.4" opacity="0.9" />
        <circle cx="49" cy="224" r="4" fill="#4b48d8" stroke="var(--color-clinical-cyan)" strokeWidth="1.4" opacity="0.9" />
      </motion.g>

      {/* Inner orbit — private facts, sealed */}
      <motion.g
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "160px 160px" }}
      >
        <circle cx="160" cy="160" r="78" stroke="var(--color-lilac-mist)" strokeWidth="1.3" strokeDasharray="5 7" opacity="0.75" />
        <circle cx="160" cy="82" r="3.4" fill="var(--color-lilac-mist)" />
        <circle cx="226" cy="198" r="3" fill="var(--color-lilac-mist)" opacity="0.8" />
        <circle cx="94" cy="198" r="3" fill="var(--color-lilac-mist)" opacity="0.8" />
      </motion.g>

      {/* Core */}
      <circle cx="160" cy="160" r="40" fill="#4b48d8" stroke="var(--color-iris-border)" strokeWidth="1.4" />
      <motion.circle
        cx="160"
        cy="160"
        r="40"
        fill="none"
        stroke="var(--color-mint-vital)"
        strokeWidth="1"
        opacity="0.35"
        animate={reduce ? undefined : { r: [40, 52, 40], opacity: [0.35, 0, 0.35] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <path
        d="M 144 160 c 5 -14 12 -14 16 0 c 4 14 11 14 16 0"
        stroke="var(--color-mint-vital)"
        strokeWidth="2.4"
        strokeLinecap="round"
        transform="translate(0 -2)"
      />
      <text x="160" y="182" textAnchor="middle" fontSize="8" letterSpacing="0.22em" fill="var(--color-lilac-mist)" fontWeight="600">
        MIDNIGHT
      </text>
    </svg>
  );
}
