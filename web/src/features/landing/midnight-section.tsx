"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PillButton } from "@/components/brand/pill-button";
import { LineReveal } from "@/components/brand/line-reveal";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";

/**
 * INTEGRATIONS (merged Midnight + Audiences) — the impilo integrations
 * moment on the Pearl light surface: an ink headline set in two revealed
 * lines, three elevated white cards each carrying a true-isometric
 * illustration drawn on a shared 30° grid (x' = (x−y)·cos30,
 * y' = (x+y)·sin30 − z), every extruded solid rendered in the impilo
 * three-tone language — lit top face (white), lit left wall (lilac),
 * shaded right wall (ink) — with mint edge highlights where rims catch
 * the top-left light and blurred elliptical ground shadows cast
 * under+right of each cluster. A centered closing paragraph, an
 * outlined pill CTA, and the collapsible zero-knowledge substance
 * kept for readers who want the deep end.
 */

const INK = "var(--color-lilac-mist)";
const MINT = "var(--color-mint-vital)";
const CYAN = "var(--color-cyan-soft)";
const TEAL = "var(--color-teal-signal)";

type Reduce = boolean | null;

function drawProps(reduce: Reduce, delay: number, dur = 1.05) {
  return {
    initial: reduce ? false : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: "-60px" },
    transition: {
      pathLength: { duration: dur, delay, ease: [0.22, 1, 0.36, 1] as const },
      opacity: { duration: 0.6, delay },
    },
  } as const;
}

function dotProps(reduce: Reduce, delay: number) {
  return {
    initial: reduce ? false : { opacity: 0, scale: 0 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
  } as const;
}

/* Dashed strokes rise as whole units — framer's pathLength would
 * clobber their stroke-dasharray (lesson recorded in Task 6-c). */
function appearProps(reduce: Reduce, delay: number, dy = 6) {
  return {
    initial: reduce ? false : { opacity: 0, y: dy },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  } as const;
}

/* ── (a) Midnight network — two interlocking extruded rhombus tiles ──
 * One solid on the iso grid, split by a puzzle-knob seam into two
 * pieces; a glowing mint sphere hovers over the knob, tethered by
 * dashed runs to a node on each piece. */
function PuzzleArt({ reduce }: { reduce: Reduce }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-full w-auto max-w-full"
      fill="none"
      role="img"
      aria-label="Two interlocking tiles on an isometric plane, joined by a glowing mint node"
    >
      <defs>
        {/* three-tone face materials — top lightest, left wall lit, right wall shaded */}
        <linearGradient id="mz-top-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-cloud-white)" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="mz-top-2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.66" />
          <stop offset="1" stopColor="var(--color-cloud-white)" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id="mz-face-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-lilac-mist)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--color-lilac-mist)" stopOpacity="0.19" />
        </linearGradient>
        <linearGradient id="mz-face-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-iris-ink)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-iris-ink)" stopOpacity="0.3" />
        </linearGradient>
        {/* lit mint sphere — specular focus pulled to the top-left */}
        <radialGradient id="mz-sphere" cx="0.5" cy="0.5" r="0.5" fx="0.36" fy="0.3">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="var(--color-mint-vital)" />
          <stop offset="1" stopColor="var(--color-mint-vital)" stopOpacity="0.72" />
        </radialGradient>
        <filter id="mz-ground-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="mz-node-blur" x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* blueprint iso grid on the ground plane */}
      <g stroke={INK} strokeWidth="1" opacity="0.32">
        <motion.path d="M 95.3 36.1 L 179.5 84.7" {...drawProps(reduce, 0.05, 0.9)} />
        <motion.path d="M 104.7 36.1 L 20.5 84.7" {...drawProps(reduce, 0.1, 0.9)} />
        <motion.path d="M 20.5 79.3 L 104.7 127.9" {...drawProps(reduce, 0.15, 0.8)} />
        <motion.path d="M 179.5 79.3 L 95.3 127.9" {...drawProps(reduce, 0.15, 0.8)} />
      </g>

      {/* colored ground shadow — blurred ellipse offset under+right (light from top-left) */}
      <motion.g {...appearProps(reduce, 0.15)}>
        <ellipse
          cx="107"
          cy="101"
          rx="54"
          ry="19"
          fill="var(--color-iris-ink)"
          opacity="0.14"
          filter="url(#mz-ground-blur)"
        />
      </motion.g>

      {/* extruded walls — lit left face (mid tone), shaded right face (dark) */}
      <motion.path
        d="M 41.5 68.8 L 100 102.5 L 100 111.7 L 41.5 78 Z"
        fill="url(#mz-face-l)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.25)}
      />
      <motion.path
        d="M 158.5 68.8 L 100 102.5 L 100 111.7 L 158.5 78 Z"
        fill="url(#mz-face-r)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.35)}
      />

      {/* top faces — the two pieces (lightest tone); the knob tab fills the notch */}
      <motion.path
        d="M 70.8 51.9 L 92 64.2 C 81.4 70.3 97.3 79.5 108 73.4 L 129.2 85.6 L 100 102.5 L 41.5 68.8 Z"
        fill="url(#mz-top-2)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.45)}
      />
      <motion.path
        d="M 100 35 L 158.5 68.8 L 129.2 85.6 L 108 73.4 C 97.3 79.5 81.4 70.3 92 64.2 L 70.8 51.9 Z"
        fill="url(#mz-top-1)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.55)}
      />

      {/* the puzzle seam — the knob cut traced across the joined surface */}
      <motion.path
        d="M 70.8 51.9 L 92 64.2 C 81.4 70.3 97.3 79.5 108 73.4 L 129.2 85.6"
        stroke={INK}
        strokeWidth="1.6"
        {...drawProps(reduce, 0.75)}
      />

      {/* edge highlights — mint where the top rim catches light (upper-right), cyan echo upper-left */}
      <motion.path
        d="M 104.7 37.7 L 153.8 66.1"
        stroke={MINT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.78"
        {...drawProps(reduce, 0.9, 0.6)}
      />
      <motion.path
        d="M 95.3 37.7 L 46.2 66.1"
        stroke={CYAN}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
        {...drawProps(reduce, 0.95, 0.5)}
      />

      {/* network — dashed surface runs from the knob to a node on each piece */}
      <motion.path
        d="M 100 68.8 L 97.7 50.7"
        stroke={INK}
        strokeWidth="1.2"
        strokeDasharray="3 4"
        {...appearProps(reduce, 1.0)}
      />
      <motion.path
        d="M 100 68.8 L 103.7 87.7"
        stroke={INK}
        strokeWidth="1.2"
        strokeDasharray="3 4"
        {...appearProps(reduce, 1.05)}
      />
      <motion.ellipse
        cx="97.7"
        cy="50.7"
        rx="2.5"
        ry="1.4"
        fill={INK}
        opacity="0.6"
        {...dotProps(reduce, 1.15)}
      />
      <motion.ellipse
        cx="103.7"
        cy="87.7"
        rx="2.5"
        ry="1.4"
        fill={INK}
        opacity="0.6"
        {...dotProps(reduce, 1.2)}
      />

      {/* the joining node — mint sphere hovering over the knob, its contact shadow grounded */}
      <motion.g {...appearProps(reduce, 1.2)}>
        <ellipse
          cx="101.5"
          cy="71.3"
          rx="5"
          ry="2.9"
          fill="var(--color-iris-ink)"
          opacity="0.12"
          filter="url(#mz-node-blur)"
        />
      </motion.g>
      <g className="float-b" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <motion.g {...appearProps(reduce, 1.3, 5)}>
          <g className="glow-mint">
            <circle cx="100" cy="60.7" r="4.2" fill="url(#mz-sphere)" />
            <circle cx="98.7" cy="59.4" r="1.1" fill="var(--color-cloud-white)" opacity="0.9" />
          </g>
        </motion.g>
      </g>
    </svg>
  );
}

/* ── (b) Wallet-proof bridge — iso sync ring with chasing arrows ──
 * The ring is a true ground-plane circle (ry/rx = tan30), the wallet
 * card a thin extruded iso tile floating at height in the same
 * coordinate system — its blurred shadow stays grounded on the
 * plane while the card drifts. */
function SyncRingArt({ reduce }: { reduce: Reduce }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-full w-auto max-w-full"
      fill="none"
      role="img"
      aria-label="A dashed sync ring in isometric perspective with two chasing arrows around a floating wallet card"
    >
      <defs>
        <linearGradient id="sr-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-cloud-white)" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="sr-face-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-lilac-mist)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--color-lilac-mist)" stopOpacity="0.19" />
        </linearGradient>
        <linearGradient id="sr-face-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-iris-ink)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-iris-ink)" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="sr-sphere" cx="0.5" cy="0.5" r="0.5" fx="0.36" fy="0.3">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="var(--color-mint-vital)" />
          <stop offset="1" stopColor="var(--color-mint-vital)" stopOpacity="0.72" />
        </radialGradient>
        <filter id="sr-ground-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* the ring — outer solid, inner dashed orbit */}
      <motion.ellipse
        cx="100"
        cy="99"
        rx="68"
        ry="39.2"
        stroke={INK}
        strokeWidth="1.8"
        {...drawProps(reduce, 0.1, 1.2)}
      />
      <motion.ellipse
        cx="100"
        cy="99"
        rx="49.6"
        ry="28.6"
        stroke={INK}
        strokeWidth="1.2"
        strokeDasharray="4 6"
        {...appearProps(reduce, 0.3)}
      />

      {/* orbit markers riding the outer ring */}
      <motion.circle cx="88.2" cy="137.6" r="2.2" fill={INK} opacity="0.5" {...dotProps(reduce, 0.5)} />
      <motion.circle cx="111.8" cy="60.4" r="2.2" fill={INK} opacity="0.5" {...dotProps(reduce, 0.55)} />

      {/* chasing arcs + arrowheads — teal, both traveling clockwise */}
      <motion.path
        d="M 61 131.1 A 68 39.2 0 0 1 61 66.9"
        stroke={TEAL}
        strokeWidth="2.4"
        strokeLinecap="round"
        {...drawProps(reduce, 0.6, 0.6)}
      />
      <motion.path
        d="M 139 66.9 A 68 39.2 0 0 1 148.1 126.7"
        stroke={TEAL}
        strokeWidth="2.4"
        strokeLinecap="round"
        {...drawProps(reduce, 0.75, 0.6)}
      />
      <motion.path
        d="M 61 66.9 L 54 66.4"
        stroke={TEAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        {...drawProps(reduce, 1.25, 0.25)}
      />
      <motion.path
        d="M 61 66.9 L 56.3 72.1"
        stroke={TEAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        {...drawProps(reduce, 1.25, 0.25)}
      />
      <motion.path
        d="M 148.1 126.7 L 155 126.3"
        stroke={TEAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        {...drawProps(reduce, 1.35, 0.25)}
      />
      <motion.path
        d="M 148.1 126.7 L 152 120.9"
        stroke={TEAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        {...drawProps(reduce, 1.35, 0.25)}
      />

      {/* the card's ground shadow — grounded while the card floats above it */}
      <motion.g {...appearProps(reduce, 0.5)}>
        <ellipse
          cx="109"
          cy="111"
          rx="30"
          ry="17.5"
          fill="var(--color-iris-ink)"
          opacity="0.14"
          filter="url(#sr-ground-blur)"
        />
      </motion.g>

      {/* the wallet card — a thin extruded iso tile levitating at the ring's center */}
      <g className="float-c" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <motion.path
          d="M 93.5 69.4 L 67.5 54.4 L 67.5 59.2 L 93.5 74.2 Z"
          fill="url(#sr-face-l)"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
          {...drawProps(reduce, 0.6)}
        />
        <motion.path
          d="M 132.5 46.9 L 93.5 69.4 L 93.5 74.2 L 132.5 51.8 Z"
          fill="url(#sr-face-r)"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
          {...drawProps(reduce, 0.65)}
        />
        <motion.path
          d="M 110.1 34 L 128.8 44.9 C 130.8 46 130.8 47.9 128.8 49 L 97.1 67.3 C 95.1 68.5 91.9 68.5 89.9 67.3 L 71.2 56.5 C 69.2 55.4 69.2 53.5 71.2 52.4 L 102.9 34 C 104.9 32.9 108.1 32.9 110.1 34 Z"
          fill="url(#sr-top)"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
          {...drawProps(reduce, 0.75, 0.9)}
        />
        {/* keyhole sealed into the card's top face */}
        <motion.ellipse
          cx="103.1"
          cy="48.9"
          rx="5.7"
          ry="3.3"
          fill="var(--color-iris-ink)"
          fillOpacity="0.35"
          stroke={INK}
          strokeWidth="1.3"
          {...drawProps(reduce, 1.0, 0.5)}
        />
        <motion.path
          d="M 98.3 49.1 L 89.1 53.4 L 95.3 57 L 102.7 51.7 Z"
          fill="var(--color-iris-ink)"
          fillOpacity="0.35"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
          {...drawProps(reduce, 1.05, 0.4)}
        />
        {/* mint rim light on the card's upper-right edge */}
        <motion.path
          d="M 111.7 34.9 L 127.3 43.9"
          stroke={MINT}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.78"
          {...drawProps(reduce, 0.95, 0.5)}
        />
      </g>

      {/* the sealed proof — mint sphere riding the ring where the chase passes */}
      <motion.g {...appearProps(reduce, 1.5, 5)}>
        <g className="glow-mint">
          <circle cx="148.1" cy="126.7" r="4.4" fill="url(#sr-sphere)" />
          <circle cx="146.7" cy="125.2" r="1.2" fill="var(--color-cloud-white)" opacity="0.9" />
        </g>
      </motion.g>
      <motion.circle cx="61" cy="66.9" r="2.8" fill={TEAL} {...dotProps(reduce, 1.45)} />
    </svg>
  );
}

/* ── (c) Public verification — extruded iso bars with a floating data layer ──
 * Three bars of rising height on a dashed base plane; a dashed data
 * layer hovers high above on a vertical tether, its shadow pooled
 * on the plane below. */
function LayeredChartsArt({ reduce }: { reduce: Reduce }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-full w-auto max-w-full"
      fill="none"
      role="img"
      aria-label="An isometric bar chart on a dashed base plane with a dashed data layer floating above it"
    >
      <defs>
        <linearGradient id="lc-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-cloud-white)" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="lc-face-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-lilac-mist)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--color-lilac-mist)" stopOpacity="0.19" />
        </linearGradient>
        <linearGradient id="lc-face-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-iris-ink)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-iris-ink)" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="lc-sphere" cx="0.5" cy="0.5" r="0.5" fx="0.36" fy="0.3">
          <stop offset="0" stopColor="var(--color-cloud-white)" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="var(--color-mint-vital)" />
          <stop offset="1" stopColor="var(--color-mint-vital)" stopOpacity="0.72" />
        </radialGradient>
        <filter id="lc-ground-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="lc-node-blur" x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* dashed iso base plane — its lit fill occludes the dot field, reading as a surface */}
      <motion.path
        d="M 100 61.5 L 159.8 96 L 100 130.5 L 40.2 96 Z"
        fill="var(--color-cloud-white)"
        fillOpacity="0.42"
        stroke={INK}
        strokeWidth="1.5"
        strokeDasharray="5 6"
        strokeLinejoin="round"
        {...appearProps(reduce, 0.1, 8)}
      />

      {/* bar A — low */}
      <motion.path
        d="M 62.6 77.1 L 74 83.7 L 74 100.2 L 62.6 93.6 Z"
        fill="url(#lc-face-l)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.3)}
      />
      <motion.path
        d="M 85.5 77.1 L 74 83.7 L 74 100.2 L 85.5 93.6 Z"
        fill="url(#lc-face-r)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.35)}
      />
      <motion.path
        d="M 74 70.5 L 85.5 77.1 L 74 83.7 L 62.6 77.1 Z"
        fill="url(#lc-top)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.45)}
      />
      <motion.path
        d="M 77.1 72.3 L 82.3 75.3"
        stroke={MINT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.78"
        {...drawProps(reduce, 0.6, 0.5)}
      />
      <motion.path
        d="M 70.9 72.3 L 65.7 75.3"
        stroke={CYAN}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
        {...drawProps(reduce, 0.65, 0.45)}
      />

      {/* bar B — mid */}
      <motion.path
        d="M 86 67.2 L 99 74.7 L 99 104.7 L 86 97.2 Z"
        fill="url(#lc-face-l)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.45)}
      />
      <motion.path
        d="M 112 67.2 L 99 74.7 L 99 104.7 L 112 97.2 Z"
        fill="url(#lc-face-r)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.5)}
      />
      <motion.path
        d="M 99 59.7 L 112 67.2 L 99 74.7 L 86 67.2 Z"
        fill="url(#lc-top)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.6)}
      />
      <motion.path
        d="M 102.1 61.5 L 108.8 65.4"
        stroke={MINT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.78"
        {...drawProps(reduce, 0.75, 0.5)}
      />
      <motion.path
        d="M 95.8 61.5 L 89.1 65.4"
        stroke={CYAN}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
        {...drawProps(reduce, 0.8, 0.45)}
      />

      {/* bar C — tall, front */}
      <motion.path
        d="M 108.8 55.5 L 123.4 63.9 L 123.4 108.9 L 108.8 100.5 Z"
        fill="url(#lc-face-l)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.6)}
      />
      <motion.path
        d="M 137.9 55.5 L 123.4 63.9 L 123.4 108.9 L 137.9 100.5 Z"
        fill="url(#lc-face-r)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.65)}
      />
      <motion.path
        d="M 123.4 47.1 L 137.9 55.5 L 123.4 63.9 L 108.8 55.5 Z"
        fill="url(#lc-top)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
        {...drawProps(reduce, 0.75)}
      />
      <motion.path
        d="M 126.5 48.9 L 134.8 53.7"
        stroke={MINT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.78"
        {...drawProps(reduce, 0.9, 0.5)}
      />
      <motion.path
        d="M 120.3 48.9 L 112 53.7"
        stroke={CYAN}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
        {...drawProps(reduce, 0.95, 0.45)}
      />

      {/* the floating layer casts a soft shadow onto the plane and bars below */}
      <motion.g {...appearProps(reduce, 1.0)}>
        <ellipse
          cx="114.5"
          cy="114.5"
          rx="34"
          ry="19"
          fill="var(--color-iris-ink)"
          opacity="0.09"
          filter="url(#lc-ground-blur)"
        />
      </motion.g>

      {/* vertical tether — pure z — from the tallest bar up to the layer */}
      <motion.path
        d="M 123.4 55.5 L 123.4 37.5"
        stroke={INK}
        strokeWidth="1.2"
        strokeDasharray="3 4"
        {...appearProps(reduce, 1.1)}
      />

      {/* mint value sphere riding the tether above bar C */}
      <motion.g {...appearProps(reduce, 1.15)}>
        <ellipse
          cx="125.4"
          cy="58.5"
          rx="5"
          ry="3"
          fill="var(--color-iris-ink)"
          opacity="0.12"
          filter="url(#lc-node-blur)"
        />
      </motion.g>
      <g className="float-b" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <motion.g {...appearProps(reduce, 1.2, 5)}>
          <g className="glow-mint">
            <circle cx="123.4" cy="47.1" r="4.2" fill="url(#lc-sphere)" />
            <circle cx="122.1" cy="45.8" r="1.1" fill="var(--color-cloud-white)" opacity="0.9" />
          </g>
        </motion.g>
      </g>

      {/* the dashed data layer — floats while its shadow stays grounded */}
      <g className="float-c" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <motion.path
          d="M 100.5 10.8 L 139.5 33.3 L 100.5 55.8 L 61.5 33.3 Z"
          fill="var(--color-lilac-mist)"
          fillOpacity="0.07"
          stroke={INK}
          strokeWidth="1.5"
          strokeDasharray="5 6"
          strokeLinejoin="round"
          {...appearProps(reduce, 1.15, 10)}
        />
        <g className="glow-mint">
          <motion.ellipse
            cx="119.5"
            cy="30.8"
            rx="2.9"
            ry="1.7"
            fill={MINT}
            {...dotProps(reduce, 1.4)}
          />
        </g>
        <motion.ellipse
          cx="90.6"
          cy="33"
          rx="2.6"
          ry="1.5"
          fill={INK}
          opacity="0.6"
          {...dotProps(reduce, 1.45)}
        />
        <motion.ellipse
          cx="100"
          cy="44.4"
          rx="2.6"
          ry="1.5"
          fill={INK}
          opacity="0.6"
          {...dotProps(reduce, 1.5)}
        />
      </g>
    </svg>
  );
}

const CARDS = [
  {
    art: PuzzleArt,
    title: "Midnight network",
    sub: "Private state and public proofs live on the same ledger.",
  },
  {
    art: SyncRingArt,
    title: "Wallet-proof bridge",
    sub: "Approve once in your wallet — the proof stands alone.",
  },
  {
    art: LayeredChartsArt,
    title: "Public verification",
    sub: "Confirm the proof on the indexer, then choose what happens next. Sites never receive the record.",
  },
];

export function MidnightSection() {
  const reduce = useReducedMotion();

  const scrollToProofFlow = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <SectionShell
      tone="light"
      id="midnight"
      aria-labelledby="midnight-heading"
    >
      <SectionContent>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <Eyebrow tone="ink">Integrations</Eyebrow>
          <LineReveal
            as="h2"
            id="midnight-heading"
            className="mt-4 text-heading-lg font-semibold text-iris-ink"
            delay={0.1}
          >
            <span>Patients, sites, proofs.</span>
            <span>It&apos;s a perfect match.</span>
          </LineReveal>
          <p className="mt-5 text-body text-iris-ink/70">
            Patients keep the record. Midnight verifies the typed match
            so you can prove eligibility without handing it over. Then
            you choose what, if anything, to share.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.article
              key={card.title}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.7,
                delay: 0.1 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-full"
            >
              {/* elevated white card — lifts on hover, border strengthens */}
              <div className="card-lift flex h-full flex-col rounded-card border border-iris-ink/10 bg-white p-6 shadow-[var(--shadow-card-light)] hover:border-iris-ink/25 sm:p-7">
                <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-field">
                  <div
                    className="bg-dots-light absolute inset-0 opacity-50"
                    aria-hidden="true"
                  />
                  {/* lit stage — white-opacity radial so the isometric solids sit on light */}
                  <div
                    className="absolute inset-0 bg-[radial-gradient(68%_60%_at_50%_42%,rgba(255,255,255,0.92),rgba(255,255,255,0)_78%)]"
                    aria-hidden="true"
                  />
                  <card.art reduce={reduce} />
                </div>
                <h3 className="mt-6 text-subheading font-semibold text-iris-ink">
                  {card.title}
                </h3>
                <p className="mt-2 text-body-sm text-iris-ink/70">{card.sub}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-12 flex max-w-xl flex-col items-center text-center"
        >
          <p className="text-body text-iris-ink/70">
            The proof flow is the integration: approve once, and every party
            checks the same sealed answer — nothing else crosses.
          </p>
          <PillButton
            variant="outline"
            size="lg"
            className="mt-8"
            iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            onClick={scrollToProofFlow}
          >
            Explore the proof flow
          </PillButton>
        </motion.div>

        {/* The deep end, kept for readers who want the zero-knowledge substance */}
        <div className="mt-10 flex justify-center">
          <Collapsible className="w-full max-w-2xl">
            <div className="flex justify-center">
              <CollapsibleTrigger className="group inline-flex items-center gap-2 rounded-pill border border-iris-ink/25 px-5 py-2.5 text-body-sm font-medium text-iris-ink transition-colors hover:border-iris-ink/55 hover:bg-iris-ink/5">
                Technical details
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4 rounded-card border border-iris-ink/10 bg-white p-5 text-center text-body-sm leading-relaxed text-iris-ink/75">
              <p>
                COHORT&apos;s eligibility predicate is proven with
                Midnight&apos;s zero-knowledge proofs: the computation is
                verified without revealing its inputs. Private state stays
                under user control; commitments and nullifiers prevent
                duplicate referrals without linking identity. The COHORT
                contract is deployed on Midnight Preprod — browser proving
                via 1AM is on the integration roadmap, and this interface is
                built so that integration plugs in without changing what you
                see.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SectionContent>
    </SectionShell>
  );
}
