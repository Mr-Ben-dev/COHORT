"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * HERO STILL-LIFE — original COHORT clinical line-art.
 *
 * Quality bar (measured from a live health-tech hero, not copied):
 *   • One overlapping still-life, not a row of icons.
 *   • Lilac hairlines on canvas-colored fills so devices occlude
 *     each other and read as volume.
 *   • Dominant object cropped by the left viewport edge.
 *   • Uniform 1px screen stroke (see .hero-cluster in globals.css).
 *   • Idle drift of 1–2px, never a bounce.
 *
 * Vocabulary is COHORT's: a vitals tablet the record never leaves,
 * a stethoscope, a thermometer, capsules, a pulse clip. No proof
 * seals, locks, or dashboard chrome in this drawing.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const FILL = "var(--color-deep-iris)";
const LINE = "var(--color-lilac-mist)";
const CABLE = "#6563DA";

const TUBE =
  "M -28 148 C -8 168, 18 188, 42 198 C 78 212, 92 228, 88 258 C 84 292, 62 318, 78 338 C 96 360, 148 368, 198 352 C 236 338, 258 302, 262 268";

export function HeroCluster({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  const draw = (delay: number, duration = 2.4) =>
    ({
      initial: reduce ? false : { pathLength: 0, opacity: 0.2 },
      animate: { pathLength: 1, opacity: 1 },
      transition: { duration, delay, ease: EASE },
    }) as const;

  return (
    <div className={cn("hero-cluster", className)} aria-hidden="true">
      <svg
        viewBox="0 0 340 420"
        preserveAspectRatio="xMinYMid meet"
        fill="none"
        overflow="visible"
      >
        {/* ── cables, behind the instruments ── */}
        <g opacity="0.9">
          <motion.path
            d="M -24 36 C 72 58, 168 118, 214 176 C 268 246, 252 322, 198 378"
            stroke={CABLE}
            strokeLinecap="round"
            {...draw(0.05, 2.8)}
          />
          <motion.path
            d="M -40 58 C 64 72, 188 124, 236 186 C 292 258, 274 336, 214 392"
            stroke={CABLE}
            strokeLinecap="round"
            {...draw(0.12, 2.9)}
          />
          <motion.path
            d="M -48 48 C 70 56, 198 108, 248 168 C 308 242, 292 328, 228 386"
            stroke={CABLE}
            strokeLinecap="round"
            {...draw(0.18, 3)}
          />
          <motion.path
            d="M -32 28 C 80 54, 176 112, 222 172 C 278 244, 264 318, 208 372"
            stroke={LINE}
            strokeLinecap="round"
            {...draw(0.35, 2.6)}
          />
        </g>

        {/* ── vitals tablet — the cropped dominant object ── */}
        <g>
          {/* cuff wrapping the base */}
          <path
            d="M -46 286 H 186 C 214 286, 226 302, 226 322 C 226 346, 208 360, 178 360 H -22 C -46 360, -54 344, -54 324 C -54 302, -46 286, -46 286 Z"
            fill={FILL}
            stroke={LINE}
            strokeLinejoin="round"
          />
          <path
            d="M -38 300 H 178"
            stroke={LINE}
            strokeLinecap="round"
            opacity="0.7"
          />
          {[8, 22, 36, 50, 64, 78, 92, 106, 120, 134, 148].map((x) => (
            <path
              key={x}
              d={`M ${x} 308 V ${x % 28 === 8 ? 328 : 322}`}
              stroke={LINE}
              strokeLinecap="round"
            />
          ))}

          {/* body — double outline for board thickness */}
          <rect
            x="-52"
            y="8"
            width="252"
            height="292"
            rx="28"
            fill={FILL}
            stroke={LINE}
          />
          <rect
            x="-48"
            y="12"
            width="244"
            height="284"
            rx="24"
            fill={FILL}
            stroke={LINE}
          />
          {/* screen */}
          <rect
            x="10"
            y="26"
            width="138"
            height="72"
            rx="11"
            fill={FILL}
            stroke={LINE}
          />
          {/* quiet vitals trace inside the screen */}
          <path
            d="M 22 64 H 48 L 56 48 L 66 78 L 76 60 H 132"
            stroke={LINE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* ── stethoscope — a filled tube, not a single stroke ── */}
        <g
          className={reduce ? undefined : "hero-drift-a"}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {/* ear tubes, cropped by the left edge */}
          <path
            d="M -36 118 C -18 128, -4 138, 6 152"
            stroke={LINE}
            strokeWidth="8"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M -36 118 C -18 128, -4 138, 6 152"
            stroke={FILL}
            strokeWidth="6"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M -22 108 C -4 120, 10 134, 18 150"
            stroke={LINE}
            strokeWidth="8"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M -22 108 C -4 120, 10 134, 18 150"
            stroke={FILL}
            strokeWidth="6"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M 6 152 C 22 174, 34 188, 42 198"
            stroke={LINE}
            strokeWidth="8"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M 6 152 C 22 174, 34 188, 42 198"
            stroke={FILL}
            strokeWidth="6"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M 18 150 C 30 168, 38 184, 42 198"
            stroke={LINE}
            strokeWidth="8"
            strokeLinecap="round"
            data-tube="true"
          />
          <path
            d="M 18 150 C 30 168, 38 184, 42 198"
            stroke={FILL}
            strokeWidth="6"
            strokeLinecap="round"
            data-tube="true"
          />

          {/* binaural join */}
          <circle cx="42" cy="198" r="6" fill={FILL} stroke={LINE} />

          {/* tubing ribbon: iris core, lilac edge */}
          <path
            d={TUBE}
            stroke={LINE}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
            data-tube="true"
          />
          <path
            d={TUBE}
            stroke={FILL}
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            data-tube="true"
          />

          {/* chestpiece — stacked discs so it sits on the tablet */}
          <circle cx="262" cy="248" r="34" fill={FILL} stroke={LINE} />
          <circle cx="262" cy="248" r="24" fill={FILL} stroke={LINE} />
          <circle cx="262" cy="248" r="13" fill={FILL} stroke={LINE} />
          <circle cx="262" cy="248" r="5" fill={FILL} stroke={LINE} />
        </g>

        {/* ── thermometer, laid across the tablet ── */}
        <g
          className={reduce ? undefined : "hero-drift-b"}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transform="rotate(32.7 204 88)"
        >
          <rect
            x="192"
            y="4"
            width="24"
            height="148"
            rx="12"
            fill={FILL}
            stroke={LINE}
          />
          <rect
            x="196"
            y="12"
            width="16"
            height="136"
            rx="8"
            fill={FILL}
            stroke={LINE}
          />
          <circle cx="204" cy="168" r="22" fill={FILL} stroke={LINE} />
          <circle cx="204" cy="168" r="14" fill={FILL} stroke={LINE} />
          <path
            d="M 204 154 V 44"
            stroke={LINE}
            strokeLinecap="round"
            opacity="0.9"
          />
          {[36, 52, 68, 84, 100, 116].map((y, i) => (
            <path
              key={y}
              d={`M 216 ${y} H ${i % 2 === 0 ? 232 : 226}`}
              stroke={LINE}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* ── capsules ── */}
        <g
          className={reduce ? undefined : "hero-drift-c"}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <g transform="rotate(-34 228 108)">
            <rect
              x="220"
              y="84"
              width="16"
              height="48"
              rx="8"
              fill={FILL}
              stroke={LINE}
            />
            <path d="M 220 108 H 236" stroke={LINE} />
          </g>
          <g transform="rotate(102 258 142)">
            <rect
              x="250"
              y="118"
              width="16"
              height="48"
              rx="8"
              fill={FILL}
              stroke={LINE}
            />
            <path d="M 250 142 H 266" stroke={LINE} />
          </g>
        </g>

        {/* ── pulse clip, sitting on the tubing ── */}
        <g
          className={reduce ? undefined : "hero-drift-d"}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transform="rotate(-12 168 348)"
        >
          <rect
            x="128"
            y="328"
            width="82"
            height="48"
            rx="15"
            fill={FILL}
            stroke={LINE}
          />
          <rect
            x="140"
            y="338"
            width="40"
            height="28"
            rx="8"
            fill={FILL}
            stroke={LINE}
          />
          <path
            d="M 192 338 C 212 334, 224 344, 222 358 C 220 370, 206 374, 192 366"
            fill={FILL}
            stroke={LINE}
            strokeLinejoin="round"
          />
          <circle cx="150" cy="352" r="3.5" fill={LINE} opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
