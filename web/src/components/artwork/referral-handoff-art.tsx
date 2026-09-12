"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ReferralHandoffArt — the positive handoff: a verified result chip
 * passes to the research site; the record stays behind on the device.
 */
export function ReferralHandoffArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 260 170"
      fill="none"
      role="img"
      aria-label="A verified eligibility result is handed to the research site while the medical record stays on the patient's device."
      className={cn("h-auto w-full max-w-[280px] select-none", className)}
    >
      {/* Device with record — stays put */}
      <g>
        <rect x="12" y="34" width="76" height="104" rx="14" stroke="var(--color-lilac-mist)" strokeWidth="1.6" strokeDasharray="6 6" />
        <rect x="24" y="48" width="52" height="76" rx="8" fill="#4b48d8" stroke="var(--color-iris-border)" />
        <line x1="33" y1="64" x2="67" y2="64" stroke="var(--color-lilac-mist)" strokeWidth="3.4" strokeLinecap="round" opacity="0.8" />
        <text x="40" y="88" fontSize="11" letterSpacing="0.24em" fill="var(--color-cloud-white)" fontWeight="600">
          •••
        </text>
        <text x="50" y="112" textAnchor="middle" fontSize="7.5" letterSpacing="0.12em" fill="var(--color-mint-vital)" fontWeight="600">
          PRIVATE
        </text>
      </g>

      {/* Result chip traveling the bridge */}
      <motion.g
        initial={reduce ? false : { x: -14, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <rect x="104" y="56" width="64" height="58" rx="12" fill="#4b48d8" stroke="var(--color-mint-vital)" strokeOpacity="0.6" />
        <circle cx="122" cy="74" r="8.5" fill="var(--color-mint-vital)" fillOpacity="0.2" stroke="var(--color-mint-vital)" strokeWidth="1.4" />
        <path d="M 118 74 l 3 3 l 6 -6.5" stroke="var(--color-mint-vital)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <text x="137" y="78" fontSize="8.5" letterSpacing="0.08em" fill="var(--color-mint-vital)" fontWeight="600">
          ELIGIBLE
        </text>
        <line x1="116" y1="92" x2="152" y2="92" stroke="var(--color-lilac-mist)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <text x="116" y="106" fontSize="7" fill="var(--color-lilac-mist)" fontWeight="500">
          NCT06218473
        </text>
      </motion.g>

      {/* Bridge line */}
      <path
        d="M 88 86 C 96 86 96 86 104 86"
        stroke="var(--color-mint-vital)"
        strokeWidth="2"
        className={reduce ? undefined : "flow-dash"}
      />
      <path d="M 168 86 H 184" stroke="var(--color-mint-vital)" strokeWidth="2" className={reduce ? undefined : "flow-dash"} />

      {/* Research site — receives the chip only */}
      <g>
        <rect x="184" y="26" width="64" height="118" rx="14" fill="#4b48d8" stroke="var(--color-iris-border)" />
        <rect x="196" y="38" width="40" height="9" rx="4.5" fill="var(--color-iris-glow)" />
        <rect x="196" y="56" width="40" height="40" rx="8" stroke="var(--color-clinical-cyan)" strokeOpacity="0.55" strokeDasharray="4 4" />
        <path d="M 210 76 l 5 5 l 9 -11" stroke="var(--color-clinical-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="216" y="114" textAnchor="middle" fontSize="7.5" letterSpacing="0.1em" fill="var(--color-lilac-mist)" fontWeight="600">
          RESEARCH SITE
        </text>
        <text x="216" y="130" textAnchor="middle" fontSize="7" fill="var(--color-lilac-mist)" fontWeight="500" opacity="0.8">
          verified result only
        </text>
      </g>
    </svg>
  );
}
