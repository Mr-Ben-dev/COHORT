"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Laptop,
  Plus,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineReveal } from "@/components/brand/line-reveal";
import { PillButton } from "@/components/brand/pill-button";
import { useCohortStore } from "@/state/cohort-store";

/**
 * HOW IT WORKS — the measured Impilo numbered 01–04 steps on the deep-navy
 * canvas (#232265 + veil + dot grid, NOT the hero indigo). Each step is a
 * split layout: a copy column (icon chip → "01." + hairline rule →
 * line-revealed headline with cyan accent words → lilac body → cyan link)
 * beside a painted line-art card. Inside the cards, shapes are filled with
 * the canvas navy (invisible — they only occlude what sits behind them)
 * and stroked in signal teal, with big data numerals, dashed sub-containers
 * and small medical glyphs, exactly like impilo.health's steps sections.
 *
 * Wave 7 depth pass (7-d): every raised surface now reads as a lit object —
 * top-lit gradient sheen, white rim-light arcs along top edges, blurred ink
 * contact shadows grounding the floats, mint/cyan glow bleeding from success
 * elements, gradient progress bars, glass-disc proof seal, smooth single-path
 * line-people, one unsynced idle float per card, and huge faded watermark
 * numerals echoing behind each step headline.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, margin: "-12% 0px" } as const;

/** Impilo voice: cyan accent word inside a step headline. */
function Accent({ children }: { children: ReactNode }) {
  return <span className="text-teal-signal">{children}</span>;
}

/** Step 04 close: the mint "verified / never" moment. */
function Mint({ children }: { children: ReactNode }) {
  return <span className="text-mint-vital">{children}</span>;
}

/** Shared motion language for the section: self-drawing strokes + group fades. */
function useArtMotion() {
  const reduce = useReducedMotion();
  /** Outline geometry draws itself, blueprint-style. */
  const draw = (delay: number, duration = 0.9) => ({
    initial: reduce ? false : { pathLength: 0 },
    whileInView: { pathLength: 1 },
    viewport: VIEWPORT,
    transition: { delay, duration, ease: EASE },
  });
  /** Content groups fade (optionally drifting up) after their outlines. */
  const appear = (delay: number, dy = 0) => ({
    initial: reduce ? false : dy > 0 ? { opacity: 0, y: dy } : { opacity: 0 },
    whileInView: dy > 0 ? { opacity: 1, y: 0 } : { opacity: 1 },
    viewport: VIEWPORT,
    transition: { delay, duration: 0.65, ease: EASE },
  });
  return { reduce, draw, appear };
}

/** Four-point sparkle — the cyan "match" node glyph. */
function sparklePath(x: number, y: number, r: number): string {
  const k = r * 0.28;
  return `M ${x} ${y - r} L ${x + k} ${y - k} L ${x + r} ${y} L ${x + k} ${y + k} L ${x} ${y + r} L ${x - k} ${y + k} L ${x - r} ${y} L ${x - k} ${y - k} Z`;
}

/** Big data numeral that counts up when scrolled into view. */
function CountNumber({
  to,
  suffix = "",
  delay = 0,
  x,
  y,
  fontSize,
  fill,
}: {
  to: number;
  suffix?: string;
  delay?: number;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGTextElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      delay,
      duration: reduce ? 0.01 : 1.25,
      ease: EASE,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduce, to, delay]);

  return (
    <text
      ref={ref}
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight={600}
      fill={fill}
    >
      {value}
      {suffix}
    </text>
  );
}

/** Dashed sub-container — rises in as a unit (dash patterns cannot pathLength-draw). */
function DashBox({
  x,
  y,
  w,
  h,
  rx = 16,
  delay = 0,
  strokeOpacity = 0.45,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  delay?: number;
  strokeOpacity?: number;
}) {
  const { appear } = useArtMotion();
  return (
    <motion.g {...appear(delay, 12)}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill="none"
        stroke="var(--color-lilac-mist)"
        strokeOpacity={strokeOpacity}
        strokeWidth="1.4"
        strokeDasharray="6 8"
      />
    </motion.g>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * STEP 01 — two line-art people read a painted trial-match card
 * ──────────────────────────────────────────────────────────────────────── */

const CRITERIA_ROWS = [
  { y: 312, w: 172, o: 0.32 },
  { y: 348, w: 138, o: 0.26 },
  { y: 384, w: 104, o: 0.2 },
];

function TrialDiscoveryArt() {
  const { draw, appear } = useArtMotion();
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      role="img"
      aria-label="Two people view a clinical-trial match card that scores a 94 percent match against dashed criteria rows."
      className="block h-auto w-full select-none"
    >
      <defs>
        <pattern
          id="hiw-dots-01"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="2"
            cy="2"
            r="1.1"
            fill="var(--color-lilac-mist)"
            opacity="0.14"
          />
        </pattern>
        {/* raise-grad — top-lit sheen: white 0.12 fading down the raised face */}
        <linearGradient id="hiw-raise-01" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-cloud-white)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-cloud-white)" stopOpacity="0" />
        </linearGradient>
        {/* shadow-blur — softens the ink contact-shadow ellipses */}
        <filter id="hiw-shadow-01" x="-100%" y="-400%" width="300%" height="900%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        {/* bar gradient — cyan head into teal tail (progress volume) */}
        <linearGradient
          id="hiw-bar-01"
          gradientUnits="userSpaceOnUse"
          x1="148"
          y1="0"
          x2="320"
          y2="0"
        >
          <stop offset="0%" stopColor="var(--color-cyan-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-teal-signal)" stopOpacity="0.7" />
        </linearGradient>
        {/* soft cyan aura behind the big match numeral */}
        <radialGradient id="hiw-num-glow-01" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-cyan-soft)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-cyan-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* dot field */}
      <motion.rect width="520" height="520" fill="url(#hiw-dots-01)" {...appear(0.05)} />

      {/* the trial list stacking behind the focused match */}
      <motion.rect
        x="172"
        y="46"
        width="256"
        height="34"
        rx="17"
        stroke="var(--color-teal-signal)"
        strokeOpacity="0.12"
        strokeWidth="1.4"
        {...draw(0.1, 0.7)}
      />
      <motion.rect
        x="152"
        y="66"
        width="296"
        height="58"
        rx="20"
        stroke="var(--color-teal-signal)"
        strokeOpacity="0.22"
        strokeWidth="1.5"
        {...draw(0.18, 0.8)}
      />

      {/* magnifier — the search motif, drifting on its own idle float */}
      <g className="float-b" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <motion.path
          d="M 86 88 a 16 16 0 1 1 -32 0 a 16 16 0 1 1 32 0"
          stroke="var(--color-teal-signal)"
          strokeWidth="1.8"
          {...draw(0.35, 0.7)}
        />
        <motion.path
          d="M 81 100 L 95 114"
          stroke="var(--color-teal-signal)"
          strokeWidth="2.4"
          strokeLinecap="round"
          {...draw(0.55, 0.4)}
        />
        <motion.circle cx="64" cy="83" r="2.2" fill="var(--color-cyan-soft)" {...appear(0.9)} />
      </g>

      {/* ink contact shadow — the card hovers above the canvas plane */}
      <motion.ellipse
        cx="230"
        cy="472"
        rx="98"
        ry="13"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-01)"
        {...appear(0.45)}
      />

      {/* main trial-match card */}
      <motion.rect
        x="90"
        y="104"
        width="280"
        height="352"
        rx="26"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.9"
        {...draw(0.28, 1.15)}
      />
      {/* top-lit sheen — the raised face is lighter at the crown */}
      <motion.rect
        x="90"
        y="104"
        width="280"
        height="352"
        rx="26"
        fill="url(#hiw-raise-01)"
        {...appear(0.75)}
      />
      {/* rim light — the glass top edge catching the light */}
      <motion.path
        d="M 163 107 Q 230 104.6 297 107"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.26"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        {...draw(1.05, 0.5)}
      />

      {/* NCT chip */}
      <motion.g {...appear(1.0)}>
        <motion.rect
          x="116"
          y="130"
          width="198"
          height="28"
          rx="14"
          fill="var(--color-navy-canvas)"
          stroke="var(--color-cyan-soft)"
          strokeWidth="1.3"
          {...draw(0.95, 0.6)}
        />
        <text
          x="215"
          y="148.5"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="0.06em"
          fill="var(--color-cyan-soft)"
        >
          NCT06218473 · PHASE 3
        </text>
      </motion.g>

      {/* the big match score — cyan aura + lit numeral */}
      <motion.ellipse
        cx="230"
        cy="212"
        rx="118"
        ry="64"
        fill="url(#hiw-num-glow-01)"
        {...appear(1.05)}
      />
      <g className="glow-cyan">
        <CountNumber
          to={94}
          suffix="%"
          x={230}
          y={232}
          fontSize={64}
          fill="var(--color-cyan-soft)"
          delay={1.25}
        />
      </g>
      <motion.g {...appear(1.55)}>
        <text
          x="230"
          y="256"
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="0.3em"
          fill="var(--color-lilac-mist)"
          fillOpacity="0.75"
        >
          MATCH SCORE
        </text>
      </motion.g>

      {/* dashed criteria zone + rows as gradient bars, softly cyan-lit */}
      <DashBox x={116} y={284} w={228} h={140} rx={16} delay={1.6} />
      <g className="glow-cyan">
        {CRITERIA_ROWS.map((row, i) => (
          <motion.g key={row.y} {...appear(1.8 + i * 0.15)}>
            <path
              d={`M 128 ${row.y - 1} l 4 4 l 7 - 8`}
              stroke="var(--color-teal-signal)"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="148"
              y={row.y - 8}
              width={row.w}
              height="9"
              rx="4.5"
              fill="url(#hiw-bar-01)"
              fillOpacity={row.o}
            />
          </motion.g>
        ))}
      </g>

      {/* person A — right of the card, viewing the data. One smooth anatomy:
       *  head circle, symmetric hair cap, single continuous bust curve (the
       *  stray neck strokes are gone), uniform 2px weight, specular glint. */}
      <motion.path
        d="M 425 193 a 23 23 0 1 1 -46 0 a 23 23 0 1 1 46 0"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(1.15, 0.9)}
      />
      <motion.path
        d="M 384 199 C 381 178 389 167 402 167 C 416 167 424 177 423 192"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(1.35, 0.7)}
      />
      <motion.path
        d="M 350 270 C 358 242 377 229 402 229 C 427 229 446 242 454 270"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        strokeLinecap="round"
        {...draw(1.5, 0.8)}
      />
      {/* specular glint — light catching the crown */}
      <motion.circle
        cx="386"
        cy="177"
        r="2.2"
        fill="var(--color-cyan-soft)"
        {...appear(2.2)}
      />

      {/* person B — bottom-left, in front of the card (same smooth anatomy) */}
      <motion.path
        d="M 123 400 a 18 18 0 1 1 -36 0 a 18 18 0 1 1 36 0"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(1.75, 0.8)}
      />
      <motion.path
        d="M 92 404 C 91 390 96 382 105 382 C 114 382 120 390 119 402"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(1.9, 0.6)}
      />
      <motion.path
        d="M 68 458 C 74 436 87 427 105 427 C 123 427 133 437 138 458"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        strokeLinecap="round"
        {...draw(2.0, 0.75)}
      />
      {/* specular glint — light catching the crown */}
      <motion.circle
        cx="92"
        cy="387"
        r="1.9"
        fill="var(--color-cyan-soft)"
        {...appear(2.35)}
      />

      {/* ambient garnish */}
      <motion.g {...appear(0.6)}>
        <g opacity="0.55">
          <path
            d="M 486 96 h 12 M 492 90 v 12"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d={sparklePath(462, 148, 5)} fill="var(--color-cyan-soft)" />
          <circle cx="52" cy="270" r="2.4" fill="var(--color-lilac-mist)" />
          <path
            d="M 470 462 c 22 -22 6 -52 -16 -62"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </motion.g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * STEP 02 — the laptop runs the check; the upload is struck out
 * ──────────────────────────────────────────────────────────────────────── */

const CHECK_ROWS = [
  { y: 192, w: 120 },
  { y: 218, w: 98 },
  { y: 244, w: 76 },
  { y: 270, w: 54 },
];

function LocalCheckArt() {
  const { reduce, draw, appear } = useArtMotion();
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      role="img"
      aria-label="A laptop runs the eligibility checklist on-device beside a struck-through cloud upload and a mint private chip."
      className="block h-auto w-full select-none"
    >
      <defs>
        <pattern
          id="hiw-dots-02"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="2"
            cy="2"
            r="1.1"
            fill="var(--color-lilac-mist)"
            opacity="0.14"
          />
        </pattern>
        {/* raise-grad — top-lit sheen: white 0.12 fading down the raised face */}
        <linearGradient id="hiw-raise-02" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-cloud-white)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-cloud-white)" stopOpacity="0" />
        </linearGradient>
        {/* shadow-blur — softens the ink contact-shadow ellipses */}
        <filter id="hiw-shadow-02" x="-100%" y="-400%" width="300%" height="900%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        {/* bar gradient — cyan head into teal tail (progress volume) */}
        <linearGradient
          id="hiw-bar-02"
          gradientUnits="userSpaceOnUse"
          x1="206"
          y1="0"
          x2="326"
          y2="0"
        >
          <stop offset="0%" stopColor="var(--color-cyan-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-teal-signal)" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* dot field */}
      <motion.rect width="520" height="520" fill="url(#hiw-dots-02)" {...appear(0.05)} />

      {/* dashed on-device work zone */}
      <DashBox x={64} y={96} w={392} h={348} rx={28} delay={0.2} strokeOpacity={0.4} />

      {/* ink contact shadow — grounds the floating laptop */}
      <motion.ellipse
        cx="260"
        cy="375"
        rx="109"
        ry="12"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-02)"
        {...appear(0.4)}
      />

      {/* laptop */}
      <motion.rect
        x="138"
        y="142"
        width="244"
        height="196"
        rx="18"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(0.35, 1.05)}
      />
      {/* top-lit sheen + rim light on the raised screen */}
      <motion.rect
        x="138"
        y="142"
        width="244"
        height="196"
        rx="18"
        fill="url(#hiw-raise-02)"
        {...appear(0.6)}
      />
      <motion.path
        d="M 182 145 Q 260 142.8 338 145"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.24"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
        {...draw(1.0, 0.5)}
      />
      <motion.rect
        x="104"
        y="342"
        width="312"
        height="18"
        rx="9"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="2"
        {...draw(1.55, 0.7)}
      />
      {/* sheen + rim light on the keyboard deck edge */}
      <motion.rect
        x="104"
        y="342"
        width="312"
        height="18"
        rx="9"
        fill="url(#hiw-raise-02)"
        {...appear(1.7)}
      />
      <motion.path
        d="M 158 345 Q 260 343.2 362 345"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.24"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        {...draw(1.9, 0.45)}
      />
      <motion.path
        d="M 234 349 h 52"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        strokeLinecap="round"
        {...draw(1.8, 0.4)}
      />

      {/* the checklist card — answered locally */}
      <motion.rect
        x="172"
        y="168"
        width="176"
        height="122"
        rx="12"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-cyan-soft)"
        strokeWidth="1.3"
        {...draw(0.85, 0.8)}
      />
      {/* top-lit sheen + rim light on the raised checklist card */}
      <motion.rect
        x="172"
        y="168"
        width="176"
        height="122"
        rx="12"
        fill="url(#hiw-raise-02)"
        {...appear(1.1)}
      />
      <motion.path
        d="M 203 171 Q 260 169.4 317 171"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        {...draw(1.35, 0.45)}
      />
      <g className="glow-cyan">
        {CHECK_ROWS.map((row, i) => (
          <motion.g key={row.y} {...appear(1.15 + i * 0.14)}>
            <circle
              cx="188"
              cy={row.y}
              r="8"
              stroke="var(--color-cyan-soft)"
              strokeOpacity="0.7"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d={`M 184.5 ${row.y - 1.5} l 2.5 2.5 l 4.5 -5`}
              stroke="var(--color-teal-signal)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="206"
              y={row.y - 4}
              width={row.w}
              height="8"
              rx="4"
              fill="url(#hiw-bar-02)"
              fillOpacity="0.28"
            />
          </motion.g>
        ))}
      </g>

      {/* mint PRIVATE chip — the answer stays here (mint-lit, hovering) */}
      <g
        className="float-c"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <g className="glow-mint">
          <motion.g {...appear(2.0)}>
            <motion.rect
              x="172"
              y="302"
              width="104"
              height="26"
              rx="13"
              fill="var(--color-navy-canvas)"
              stroke="var(--color-mint-vital)"
              strokeWidth="1.4"
              {...draw(1.9, 0.6)}
            />
            <text
              x="224"
              y="319.5"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="600"
              letterSpacing="0.22em"
              fill="var(--color-mint-vital)"
            >
              PRIVATE
            </text>
          </motion.g>
        </g>
      </g>

      {/* the upload that never happens */}
      <motion.path
        d="M 384 250 Q 394 250 397 242"
        stroke="var(--color-teal-signal)"
        strokeOpacity="0.5"
        strokeWidth="1.6"
        fill="none"
        className={reduce ? undefined : "flow-dash"}
        {...appear(1.8)}
      />
      <motion.path
        d="M 398 232 q -4 -17 12 -20 q 2 -16 19 -14 q 14 1 17 13 q 15 1 14 15 q 0 11 -13 11 h -37 q -11 0 -12 -5 z"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        fill="none"
        {...draw(1.7, 0.9)}
      />
      <motion.path
        d="M 428 192 L 428 168 M 421 176 L 428 168 L 435 176"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        {...draw(2.0, 0.5)}
      />
      <motion.path
        d="M 386 158 L 478 258"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.6"
        strokeWidth="2.6"
        strokeLinecap="round"
        {...draw(2.35, 0.45)}
      />
      <motion.g {...appear(2.55)}>
        <text
          x="432"
          y="282"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.24em"
          fill="var(--color-lilac-mist)"
          fillOpacity="0.6"
        >
          NO UPLOAD
        </text>
      </motion.g>

      {/* droplet + heart glyphs */}
      <motion.path
        d="M 96 400 c -8 12 -8 20 0 25 c 8 -5 8 -13 0 -25"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--color-navy-canvas)"
        {...draw(2.15, 0.6)}
      />
      <motion.path
        d="M 430 406 c -6 -8 -16 0 -10 9 q 4 6 10 10 q 6 -4 10 -10 c 6 -9 -4 -17 -10 -9 z"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="var(--color-navy-canvas)"
        {...draw(2.3, 0.6)}
      />

      {/* ambient garnish */}
      <motion.g {...appear(0.6)}>
        <g opacity="0.55">
          <path
            d="M 62 120 h 10 M 67 115 v 10"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d={sparklePath(470, 110, 4.5)} fill="var(--color-cyan-soft)" />
          <circle cx="48" cy="210" r="2.2" fill="var(--color-lilac-mist)" />
        </g>
      </motion.g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * STEP 03 — masked record → dashed flow → rotating proof seal
 * ──────────────────────────────────────────────────────────────────────── */

const MASK_ROWS = [
  { y: 216, w: 134, o: 0.26 },
  { y: 252, w: 106, o: 0.2 },
  { y: 288, w: 122, o: 0.23 },
  { y: 324, w: 90, o: 0.16 },
];

function ProofSealArt() {
  const { reduce, draw, appear } = useArtMotion();
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      role="img"
      aria-label="A masked record card flows through a dashed line into a rotating zero-knowledge proof seal with a mint verified check."
      className="block h-auto w-full select-none"
    >
      <defs>
        <pattern
          id="hiw-dots-03"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="2"
            cy="2"
            r="1.1"
            fill="var(--color-lilac-mist)"
            opacity="0.14"
          />
        </pattern>
        {/* raise-grad — top-lit sheen: white 0.12 fading down the raised face */}
        <linearGradient id="hiw-raise-03" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-cloud-white)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-cloud-white)" stopOpacity="0" />
        </linearGradient>
        {/* shadow-blur — softens the ink contact-shadow ellipses */}
        <filter id="hiw-shadow-03" x="-100%" y="-400%" width="300%" height="900%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <radialGradient id="hiw-seal-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-mint-vital)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--color-mint-vital)" stopOpacity="0" />
        </radialGradient>
        <marker
          id="hiw-flow-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--color-mint-vital)" />
        </marker>
      </defs>

      {/* dot field */}
      <motion.rect width="520" height="520" fill="url(#hiw-dots-03)" {...appear(0.05)} />

      {/* ink contact shadow — grounds the floating record card */}
      <motion.ellipse
        cx="159"
        cy="392"
        rx="66"
        ry="11"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-03)"
        {...appear(0.4)}
      />

      {/* masked record card */}
      <motion.rect
        x="64"
        y="120"
        width="190"
        height="256"
        rx="20"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.8"
        {...draw(0.28, 1.05)}
      />
      {/* top-lit sheen + rim light on the raised record card */}
      <motion.rect
        x="64"
        y="120"
        width="190"
        height="256"
        rx="20"
        fill="url(#hiw-raise-03)"
        {...appear(0.6)}
      />
      <motion.path
        d="M 97 123 Q 159 121.2 221 123"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.24"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
        {...draw(0.9, 0.5)}
      />
      <motion.g {...appear(0.95)}>
        <circle
          cx="104"
          cy="157"
          r="13"
          stroke="var(--color-cyan-soft)"
          strokeOpacity="0.8"
          strokeWidth="1.5"
          fill="none"
        />
        <rect x="128" y="149" width="102" height="9" rx="4.5" fill="var(--color-cyan-soft)" fillOpacity="0.4" />
        <rect x="128" y="165" width="64" height="7" rx="3.5" fill="var(--color-cyan-soft)" fillOpacity="0.22" />
      </motion.g>
      <motion.path
        d="M 88 192 H 230"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.25"
        strokeWidth="1.2"
        strokeLinecap="round"
        {...draw(0.9, 0.5)}
      />
      {MASK_ROWS.map((row, i) => (
        <motion.rect
          key={row.y}
          x="88"
          y={row.y}
          width={row.w}
          height="10"
          rx="5"
          fill="var(--color-cyan-soft)"
          fillOpacity={row.o}
          {...appear(1.05 + i * 0.12)}
        />
      ))}
      <motion.g {...appear(1.55)}>
        <rect
          x="90"
          y="346"
          width="84"
          height="22"
          rx="11"
          fill="var(--color-navy-canvas)"
          stroke="var(--color-lilac-mist)"
          strokeOpacity="0.4"
          strokeWidth="1.3"
        />
        <text
          x="132"
          y="360.5"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.22em"
          fill="var(--color-lilac-mist)"
          fillOpacity="0.85"
        >
          MASKED
        </text>
      </motion.g>

      {/* dashed flow into the seal */}
      <motion.g {...appear(1.25)}>
        <path
          d="M 254 248 C 288 248 300 238 336 238"
          stroke="var(--color-teal-signal)"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#hiw-flow-arrow)"
          className={reduce ? undefined : "flow-dash"}
        />
        <circle cx="274" cy="247" r="3" fill="var(--color-teal-signal)" />
        <circle cx="306" cy="244" r="3" fill="var(--color-teal-signal)" />
      </motion.g>

      {/* ink contact shadow — the seal hovers above the canvas */}
      <motion.ellipse
        cx="392"
        cy="315"
        rx="45"
        ry="9"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-03)"
        {...appear(1.2)}
      />

      {/* the proof seal — rotating dashed ring + mint check, hovering on its
       *  own unsynced drift. The inner disc is glass: top-lit sheen plus a
       *  refractive highlight arc following the curve. */}
      <g
        className="float-c"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <g transform="translate(392 238)">
          <motion.circle r="76" fill="url(#hiw-seal-glow)" {...appear(1.15)} />
          <motion.g {...appear(1.3)}>
            <circle
              r="64"
              fill="none"
              stroke="var(--color-teal-signal)"
              strokeWidth="1.6"
              strokeDasharray="5 8"
              style={{ transformBox: "fill-box" }}
              className={reduce ? undefined : "ring-spin"}
            />
          </motion.g>
          <motion.path
            d="M 52 0 a 52 52 0 1 1 -104 0 a 52 52 0 1 1 104 0"
            fill="none"
            stroke="var(--color-lilac-mist)"
            strokeOpacity="0.25"
            strokeWidth="1.2"
            {...draw(1.4, 0.9)}
          />
          <motion.circle r="44" fill="var(--color-navy-canvas)" {...appear(1.45)} />
          {/* glass sheen — the disc is lighter at the crown */}
          <motion.circle r="44" fill="url(#hiw-raise-03)" {...appear(1.5)} />
          {/* refractive highlight arc — light bending along the top-left curve */}
          <motion.path
            d="M -38 -3 A 38 38 0 0 1 27 -27"
            stroke="var(--color-cloud-white)"
            strokeOpacity="0.2"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            {...draw(1.55, 0.5)}
          />
          <g className="glow-mint">
            <motion.path
              d="M -15 2 L -4 12 L 18 -14"
              stroke="var(--color-mint-vital)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              {...draw(1.7, 0.55)}
            />
          </g>
        </g>
      </g>

      {/* VERIFIED chip — mint-lit */}
      <g className="glow-mint">
        <motion.g {...appear(2.0)}>
          <motion.rect
            x="332"
            y="330"
            width="120"
            height="26"
            rx="13"
            fill="var(--color-navy-canvas)"
            stroke="var(--color-mint-vital)"
            strokeOpacity="0.55"
            strokeWidth="1.4"
            {...draw(1.95, 0.6)}
          />
          <text
            x="392"
            y="347.5"
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="0.26em"
            fill="var(--color-mint-vital)"
          >
            VERIFIED
          </text>
        </motion.g>
      </g>

      {/* lock garnish */}
      <motion.rect
        x="86"
        y="420"
        width="26"
        height="20"
        rx="5"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.6"
        {...draw(2.15, 0.5)}
      />
      <motion.path
        d="M 92 420 v -6 a 7 7 0 0 1 14 0 V 420"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        {...draw(2.3, 0.4)}
      />
      <motion.circle cx="99" cy="429" r="2.2" fill="var(--color-cyan-soft)" {...appear(2.45)} />

      {/* ambient garnish */}
      <motion.g {...appear(0.6)}>
        <g opacity="0.55">
          <path
            d="M 478 84 q -36 4 -46 40"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d={sparklePath(486, 150, 4)} fill="var(--color-cyan-soft)" />
          <path
            d="M 48 146 h 10 M 53 141 v 10"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="54" cy="320" r="2.2" fill="var(--color-lilac-mist)" />
        </g>
      </motion.g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * STEP 04 — the site dashboard verifies eligibility, never identity
 * ──────────────────────────────────────────────────────────────────────── */

const BADGE_ROWS = [
  { y: 318, icon: "shield", bar: 168 },
  { y: 354, icon: "bolt", bar: 140 },
  { y: 390, icon: "file", bar: 112 },
] as const;

function SiteVerifyArt() {
  const { draw, appear } = useArtMotion();
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      role="img"
      aria-label="A site dashboard shows a large mint eligible result with verification badge rows, while an identity card stays locked away."
      className="block h-auto w-full select-none"
    >
      <defs>
        <pattern
          id="hiw-dots-04"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="2"
            cy="2"
            r="1.1"
            fill="var(--color-lilac-mist)"
            opacity="0.14"
          />
        </pattern>
        {/* raise-grad — top-lit sheen: white 0.12 fading down the raised face */}
        <linearGradient id="hiw-raise-04" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-cloud-white)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-cloud-white)" stopOpacity="0" />
        </linearGradient>
        {/* shadow-blur — softens the ink contact-shadow ellipses */}
        <filter id="hiw-shadow-04" x="-100%" y="-400%" width="300%" height="900%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        {/* soft mint aura behind the eligible verdict */}
        <radialGradient id="hiw-eligible-glow-04" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-mint-vital)" stopOpacity="0.13" />
          <stop offset="100%" stopColor="var(--color-mint-vital)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* dot field */}
      <motion.rect width="520" height="520" fill="url(#hiw-dots-04)" {...appear(0.05)} />

      {/* ink contact shadows — the dashboard + the hovering identity card */}
      <motion.ellipse
        cx="260"
        cy="452"
        rx="130"
        ry="15"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-04)"
        {...appear(0.45)}
      />
      <motion.ellipse
        cx="436"
        cy="477"
        rx="31"
        ry="7"
        fill="#161658"
        opacity="0.4"
        filter="url(#hiw-shadow-04)"
        {...appear(2.5)}
      />

      {/* site dashboard card */}
      <motion.rect
        x="74"
        y="84"
        width="372"
        height="352"
        rx="26"
        fill="var(--color-navy-canvas)"
        stroke="var(--color-teal-signal)"
        strokeWidth="1.9"
        {...draw(0.28, 1.15)}
      />
      {/* top-lit sheen + rim light on the raised site window */}
      <motion.rect
        x="74"
        y="84"
        width="372"
        height="352"
        rx="26"
        fill="url(#hiw-raise-04)"
        {...appear(0.7)}
      />
      <motion.path
        d="M 139 87 Q 260 84.8 381 87"
        stroke="var(--color-cloud-white)"
        strokeOpacity="0.26"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        {...draw(1.05, 0.5)}
      />

      {/* browser chrome */}
      <motion.g {...appear(0.85)}>
        <circle cx="100" cy="110" r="3.5" fill="var(--color-lilac-mist)" opacity="0.55" />
        <circle cx="116" cy="110" r="3.5" fill="var(--color-lilac-mist)" opacity="0.4" />
        <circle cx="132" cy="110" r="3.5" fill="var(--color-lilac-mist)" opacity="0.28" />
      </motion.g>
      <motion.path
        d="M 88 124 H 432"
        stroke="var(--color-lilac-mist)"
        strokeOpacity="0.2"
        strokeWidth="1.2"
        {...draw(0.75, 0.5)}
      />
      <motion.g {...appear(1.0)}>
        <rect x="100" y="140" width="150" height="10" rx="5" fill="var(--color-cyan-soft)" fillOpacity="0.4" />
        <rect x="100" y="158" width="96" height="8" rx="4" fill="var(--color-cyan-soft)" fillOpacity="0.22" />
      </motion.g>

      {/* the answer — big, mint, final, lit */}
      <DashBox x={100} y={186} w={270} h={112} rx={16} delay={1.35} strokeOpacity={0.4} />
      <motion.ellipse
        cx="235"
        cy="240"
        rx="122"
        ry="58"
        fill="url(#hiw-eligible-glow-04)"
        {...appear(1.45)}
      />
      <g className="glow-mint">
        <motion.g {...appear(1.6)}>
          <text
            x="212"
            y="250"
            textAnchor="middle"
            fontSize="44"
            fontWeight="600"
            letterSpacing="-0.01em"
            fill="var(--color-mint-vital)"
          >
            ELIGIBLE
          </text>
        </motion.g>
        <motion.path
          d="M 336 232 l 8 8 l 14 -16"
          stroke="var(--color-mint-vital)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          {...draw(1.9, 0.5)}
        />
      </g>
      <motion.g {...appear(1.95)}>
        <text
          x="212"
          y="278"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.2em"
          fill="var(--color-lilac-mist)"
          fillOpacity="0.7"
        >
          TRIAL NCT06218473
        </text>
      </motion.g>

      {/* verification badge rows */}
      {BADGE_ROWS.map((row, i) => (
        <motion.g key={row.y} {...appear(2.1 + i * 0.15)}>
          <motion.rect
            x="100"
            y={row.y}
            width="320"
            height="28"
            rx="14"
            fill="var(--color-navy-canvas)"
            stroke="var(--color-lilac-mist)"
            strokeOpacity="0.25"
            strokeWidth="1.2"
            {...draw(2.0 + i * 0.15, 0.6)}
          />
          {row.icon === "shield" && (
            <path
              d={`M 116 ${row.y + 7} l 9 -4 l 9 4 v 7 q 0 7 -9 9 q -9 -2 -9 -9 z`}
              stroke="var(--color-teal-signal)"
              strokeWidth="1.4"
              fill="none"
              strokeLinejoin="round"
            />
          )}
          {row.icon === "bolt" && (
            <path
              d={`M 128 ${row.y + 4} L 121 ${row.y + 17} H 126 L 121 ${row.y + 26} L 134 ${row.y + 14} H 128 L 133 ${row.y + 4} Z`}
              stroke="var(--color-teal-signal)"
              strokeWidth="1.4"
              fill="none"
              strokeLinejoin="round"
            />
          )}
          {row.icon === "file" && (
            <path
              d={`M 118 ${row.y + 6} v 19 h 13 v -15 l -4 -4 z M 127 ${row.y + 6} v 4 h 4`}
              stroke="var(--color-teal-signal)"
              strokeWidth="1.4"
              fill="none"
              strokeLinejoin="round"
            />
          )}
          <rect
            x="146"
            y={row.y + 10}
            width={row.bar}
            height="8"
            rx="4"
            fill="var(--color-cyan-soft)"
            fillOpacity="0.28"
          />
          <path
            d={`M 398 ${row.y + 14} l 3.5 3.5 l 6 -7`}
            className="glow-mint"
            stroke="var(--color-mint-vital)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>
      ))}

      {/* the identity that never arrives — locked away, hovering on its own
       *  unsynced drift above the dashboard corner */}
      <g
        className="float-b"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <motion.g {...appear(2.55)}>
          <motion.rect
            x="392"
            y="406"
            width="88"
            height="58"
            rx="10"
            fill="var(--color-navy-canvas)"
            stroke="var(--color-lilac-mist)"
            strokeOpacity="0.45"
            strokeWidth="1.5"
            {...draw(2.6, 0.7)}
          />
          {/* top-lit sheen + rim light on the raised id card */}
          <rect x="392" y="406" width="88" height="58" rx="10" fill="url(#hiw-raise-04)" />
          <motion.path
            d="M 408 409 Q 436 407.6 465 409"
            stroke="var(--color-cloud-white)"
            strokeOpacity="0.2"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            {...draw(2.7, 0.4)}
          />
          <circle
            cx="414"
            cy="428"
            r="9"
            stroke="var(--color-lilac-mist)"
            strokeOpacity="0.5"
            strokeWidth="1.4"
            fill="none"
          />
          <rect x="432" y="418" width="38" height="6" rx="3" fill="var(--color-lilac-mist)" fillOpacity="0.35" />
          <rect x="432" y="430" width="28" height="5" rx="2.5" fill="var(--color-lilac-mist)" fillOpacity="0.22" />
          <motion.g {...appear(2.75)}>
            <circle cx="392" cy="446" r="13" fill="var(--color-navy-canvas)" stroke="var(--color-mint-vital)" strokeWidth="1.5" />
            <rect
              x="386.5"
              y="441"
              width="11"
              height="8.5"
              rx="2"
              fill="none"
              stroke="var(--color-mint-vital)"
              strokeWidth="1.5"
            />
            <path
              d="M 388.5 441 v -2.5 a 3.5 3.5 0 0 1 7 0 V 441"
              fill="none"
              stroke="var(--color-mint-vital)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.g>
        </motion.g>
      </g>

      {/* ambient garnish */}
      <motion.g {...appear(0.6)}>
        <g opacity="0.55">
          <path
            d="M 34 64 q 40 -4 54 26"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d={sparklePath(486, 100, 4.5)} fill="var(--color-cyan-soft)" />
          <path
            d="M 52 236 h 10 M 57 231 v 10"
            stroke="var(--color-lilac-mist)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="484" cy="300" r="2.2" fill="var(--color-lilac-mist)" />
        </g>
      </motion.g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Step anatomy — copy column, link, illustration frame
 * ──────────────────────────────────────────────────────────────────────── */

/** The painted illustration card — flat navy fill so painted shapes vanish
 *  and only their strokes read (impilo's occlusion trick). */
function ArtFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="overflow-hidden rounded-card-elevated border border-lilac-mist/20 bg-navy-canvas shadow-glow-lg">
        {children}
      </div>
    </div>
  );
}

type StepLink =
  | { label: string; view: { name: "trials" } }
  | { label: string; anchor: string };

/** "Learn more →" style cyan link — navigates a view or anchors a section. */
function StepLinkControl({ link }: { link: StepLink }) {
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();
  const className =
    "group inline-flex min-h-11 items-center gap-2 rounded-pill pr-3 text-body-sm font-semibold text-teal-signal transition-colors duration-300 hover:text-cyan-soft";
  const label = (
    <>
      {link.label}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </>
  );

  if ("view" in link) {
    return (
      <button type="button" className={className} onClick={() => navigate(link.view)}>
        {label}
      </button>
    );
  }
  return (
    <a
      href={`#${link.anchor}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        document
          .getElementById(link.anchor)
          ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }}
    >
      {label}
    </a>
  );
}

function StepCopy({ step }: { step: StepDef }) {
  const { appear } = useArtMotion();
  const Icon = step.icon;
  return (
    <div className="relative isolate max-w-[560px]">
      {/* watermark numeral — a huge faded depth ghost echoing behind the
       *  headline (impilo's layered-number signature; text stays on top) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 top-8 -z-10 select-none text-[clamp(6rem,12vw,8.75rem)] font-semibold leading-none tracking-[-0.05em] text-cloud-white/[0.06]"
      >
        {step.n}
      </span>

      {/* icon chip */}
      <motion.div
        {...appear(0)}
        className="flex h-11 w-11 items-center justify-center rounded-field border border-lilac-mist/25 bg-cloud-white/[0.04]"
      >
        <Icon className="h-5 w-5 text-teal-signal" strokeWidth={1.7} aria-hidden="true" />
      </motion.div>

      {/* number + hairline rule */}
      <motion.div {...appear(0.06)} className="mt-6 flex items-center gap-5">
        <span className="text-xl font-semibold tracking-[-0.02em] text-teal-signal">
          {step.n}.
        </span>
        <span
          className="h-px flex-1 bg-gradient-to-r from-lilac-mist/30 to-transparent"
          aria-hidden="true"
        />
      </motion.div>

      {/* line-revealed headline with accent words */}
      <LineReveal
        as="h3"
        delay={0.12}
        className="mt-5 text-[clamp(1.75rem,3.3vw,2.625rem)] font-semibold leading-[1.07] tracking-[-0.03em] text-cloud-white"
      >
        {step.lines}
      </LineReveal>

      <motion.p {...appear(0.4)} className="mt-5 max-w-xl text-body text-lilac-mist/75">
        {step.body}
      </motion.p>

      {step.link ? (
        <motion.div {...appear(0.55)} className="mt-6">
          <StepLinkControl link={step.link} />
        </motion.div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Section assembly
 * ──────────────────────────────────────────────────────────────────────── */

interface StepDef {
  n: string;
  icon: LucideIcon;
  lines: ReactNode[];
  body: string;
  link?: StepLink;
  art: ComponentType;
}

const STEPS: StepDef[] = [
  {
    n: "01",
    icon: Search,
    lines: [
      <span key="a">
        COHORT <Accent>identifies</Accent> trials
      </span>,
      <span key="b">
        you may <Accent>qualify</Accent> for.
      </span>,
    ],
    body: "Browse publicly listed recruiting studies. Public ClinicalTrials.gov criteria, filtered on your device. No COHORT account. Your facts stay here.",
    link: { label: "See the live trials list", view: { name: "trials" } },
    art: TrialDiscoveryArt,
  },
  {
    n: "02",
    icon: Laptop,
    lines: [
      <span key="a">Your check runs</span>,
      <span key="b">
        on <Accent>your device</Accent>,
      </span>,
      <span key="c">not a server.</span>,
    ],
    body: "Answer a few questions and your health facts are evaluated locally — on your device, never uploaded. COHORT never receives your medical record; the check runs where your answers live.",
    art: LocalCheckArt,
  },
  {
    n: "03",
    icon: ShieldCheck,
    lines: [
      <span key="a">
        A <Accent>zero-knowledge</Accent>
      </span>,
      <span key="b">
        <Accent>proof</Accent> carries the answer.
      </span>,
    ],
    body: "A zero-knowledge proof is sealed via your Midnight wallet: the eligibility computation is verified without revealing a single fact behind it.",
    link: { label: "How zero-knowledge works", anchor: "midnight" },
    art: ProofSealArt,
  },
  {
    n: "04",
    icon: BadgeCheck,
    lines: [
      <span key="a">
        The site <Mint>verifies</Mint>
      </span>,
      <span key="b">eligibility,</span>,
      <span key="c">
        <Mint>never your record.</Mint>
      </span>,
    ],
    body: "A site you choose can open the public verification record: eligibility proven, typed subset only, facts never included. No payment is attached — the live contract does not hold bounty.",
    art: SiteVerifyArt,
  },
];

export function HowItWorksSection() {
  const { appear } = useArtMotion();
  const navigate = useCohortStore((s) => s.navigate);

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative w-full scroll-mt-24 bg-navy-canvas py-20 sm:py-28 lg:py-32"
    >
      {/* measured impilo steps canvas — navy veil + dot grid */}
      <div className="bg-navy-veil pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      {/* film grain — the impilo noise atmosphere over the navy canvas */}
      <div className="bg-noise pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* section header */}
        <motion.p
          {...appear(0)}
          className="text-caption font-semibold uppercase tracking-[0.22em] text-teal-signal"
        >
          How it works
        </motion.p>
        <LineReveal
          as="h2"
          id="how-heading"
          delay={0.1}
          className="mt-6 max-w-3xl text-[clamp(2.25rem,4.4vw,3.375rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-cloud-white"
        >
          <span>Four steps.</span>
          <span>
            One <Accent>private proof.</Accent>
          </span>
        </LineReveal>
        <motion.p {...appear(0.45)} className="mt-6 max-w-xl text-body text-lilac-mist/70">
          From public trial criteria to a public qualification — every step below
          runs without your record ever leaving your device.
        </motion.p>

        {/* steps 01–04, alternating sides */}
        <div className="mt-16 space-y-24 sm:mt-24 sm:space-y-32 lg:space-y-40">
          {STEPS.map((step, i) => {
            const Art = step.art;
            return (
              <div
                key={step.n}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-24"
              >
                <div className={cn(i % 2 === 1 && "lg:order-2")}>
                  <StepCopy step={step} />
                </div>
                <div className={cn(i % 2 === 1 && "lg:order-1")}>
                  <ArtFrame>
                    <Art />
                  </ArtFrame>
                </div>
              </div>
            );
          })}
        </div>

        {/* the formula: criteria + facts → proof → result — a glass
            panel catching the section light, with balanced internal
            rhythm (pills / breathing subtext / CTA) */}
        <motion.div
          {...appear(0.15)}
          role="group"
          aria-label="The eligibility formula"
          className="glass-panel-soft mt-16 rounded-card-elevated p-7 pb-9 sm:mt-24 sm:p-9 sm:pb-11"
        >
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <span className="rounded-pill border border-teal-signal/50 bg-teal-signal/10 px-5 py-3 text-body-sm font-semibold text-cloud-white">
              Public trial criteria
            </span>
            <Plus className="h-5 w-5 shrink-0 text-lilac-mist/50" aria-hidden="true" />
            <span className="rounded-pill border border-lilac-mist/30 bg-lilac-mist/10 px-5 py-3 text-body-sm font-semibold text-cloud-white">
              Private health facts
            </span>
            <ChevronDown
              className="h-5 w-5 shrink-0 rotate-[-90deg] text-lilac-mist/50 sm:rotate-0"
              aria-hidden="true"
            />
            <span className="rounded-pill bg-cloud-white px-5 py-3 text-body-sm font-semibold text-iris-ink shadow-[0_8px_18px_-8px_rgba(22,22,88,0.6)]">
              Private proof
            </span>
            <ChevronDown
              className="h-5 w-5 shrink-0 rotate-[-90deg] text-lilac-mist/50 sm:rotate-0"
              aria-hidden="true"
            />
            <span className="glow-mint rounded-pill border border-mint-vital/70 bg-mint-vital/15 px-5 py-3 text-body-sm font-semibold text-mint-vital">
              Verified result
            </span>
          </div>
          <p className="mt-7 text-center text-body-sm leading-[1.6] text-lilac-mist/65">
            Public rules + private facts → a proof that satisfies both,
            without ever merging them.{" "}
            <span className="font-semibold text-cloud-white">
              Powered by Midnight.
            </span>
          </p>
          <div className="mt-9 flex justify-center">
            <PillButton
              size="lg"
              iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate({ name: "trials" })}
            >
              Find a trial
            </PillButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
