"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * InterfaceDashboard — the hero's painted centerpiece, measured from
 * impilo.health's 1340×870 "Interface" illustration: rounded window,
 * left profile sidebar (~28% width) with avatar + name + meta + masked
 * record rows, right tab pills + metric pills + one large data card
 * (big soft numerals, candlestick range bars, smooth Bézier chart with
 * gradient area + pulsing data points, date axis) and a bottom share
 * strip with the rotating proof seal.
 *
 * Glass depth system (wave 7): token fills stay impilo-measured, but
 * every pane is layered like real glass — a top-lit sheen gradient, a
 * whisper dot-grid texture on the data card, and inset top-edge
 * highlight strokes ("the edge catching light") on window, sidebar,
 * cards and pills. The whole window floats: a large blurred grounding
 * shadow at y+40 plus a tight contact shadow sit behind the frame, so
 * the panel reads ~50px above the canvas. The chart is a Catmull-Rom
 * smoothed Bézier with a teal→mint gradient area wash and radar-ping
 * halos on the data points.
 *
 * All motion honors prefers-reduced-motion.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* token-mapped impilo interface palette */
const PANEL = "var(--color-iris-shadow)"; // #3b38b7 — window bg
const FIELD = "var(--color-deep-iris)"; // #3f3ccd — inner cards
const RAISE = "var(--color-iris-pulse)"; // #524fd9 — active states
const SOFT = "var(--color-cyan-soft)"; // #70b2ff — numerals / bars
const INK = "var(--color-pearl-bright)"; // #f4f4fb — text ink
const LILAC = "var(--color-lilac-mist)";
const MINT = "var(--color-mint-vital)";
const TEAL = "var(--color-teal-signal)"; // #3faeff — chart line
const GLOW = "var(--color-iris-glow)"; // #161658 — elevation shadow ink
const GLASS = "var(--color-cloud-white)"; // white — sheen / highlight layers

/** Sidebar record rows — values masked as soft-blue bars (privacy). */
const RECORDS: { k: string; w: number }[] = [
  { k: "AGE", w: 64 },
  { k: "HbA1c", w: 96 },
  { k: "MEDS", w: 120 },
  { k: "BMI", w: 84 },
];

/** Tab pills — PROOF is the active surface. */
const TABS: string[] = ["CRITERIA", "CHECK", "PROOF", "SHARE"];

/** Metric pills — the checked criteria chips. */
const METRICS: string[] = ["AGE", "HbA1c", "MEDS", "BMI", "eGFR"];

/** Chart range bars (x, y, h) — impilo candlestick signature. */
const RANGES: { x: number; y: number; h: number }[] = [
  { x: 386, y: 372, h: 58 },
  { x: 428, y: 352, h: 80 },
  { x: 470, y: 388, h: 44 },
  { x: 512, y: 340, h: 92 },
  { x: 554, y: 362, h: 64 },
  { x: 596, y: 336, h: 96 },
  { x: 638, y: 378, h: 40 },
  { x: 680, y: 348, h: 84 },
];

/** Line data-point dots (x centers, y). */
const DOTS: { x: number; y: number }[] = [
  { x: 389.5, y: 420 },
  { x: 431.5, y: 404 },
  { x: 473.5, y: 428 },
  { x: 515.5, y: 396 },
  { x: 557.5, y: 382 },
  { x: 599.5, y: 360 },
  { x: 641.5, y: 366 },
  { x: 683.5, y: 342 },
];

/**
 * Catmull-Rom → cubic Bézier: converts the dot grid into one flowing
 * curve. Control points sit at 1/6 of the neighbor displacement, with
 * endpoint reflection — gentle, organic banking through each point.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

const LINE_MAIN = smoothPath(DOTS);
const LINE_ECHO = smoothPath(DOTS.map((p) => ({ x: p.x, y: p.y + 14 })));

/** Chart baseline y — the gradient area closes down to it. */
const BASE_Y = 468;
const AREA_MAIN = `${LINE_MAIN} L ${DOTS[DOTS.length - 1].x} ${BASE_Y} L ${DOTS[0].x} ${BASE_Y} Z`;

/** X-axis date labels (impilo "M.DD.YY" style), every other bar. */
const DATE_LABELS: { x: number; t: string }[] = [
  { x: 389.5, t: "7.3.25" },
  { x: 473.5, t: "9.18.25" },
  { x: 557.5, t: "12.2.25" },
  { x: 641.5, t: "2.14.26" },
];

/** Verified-criteria checklist — where the numbers live now. */
const CRITERIA: string[] = [
  "Age band 45–65",
  "HbA1c 5.3–6.8%",
  "Type 2 diabetes",
  "No ACE inhibitors",
];

/**
 * Inset top-edge highlight — the glass edge catching light. A thin
 * round-capped line set a few px inside a panel's top edge.
 */
const edgeLight = (x: number, y: number, w: number, inset = 14): string =>
  `M ${x + inset} ${y + 3} H ${x + w - inset}`;

export function InterfaceDashboard() {
  const reduce = useReducedMotion();
  const draw = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.7 + i * 0.07, duration: 0.7, ease: EASE },
  });

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.55, ease: EASE }}
      className="relative"
      role="img"
      aria-label="COHORT interface preview — a private record panel on the left and a verified trial-match confidence chart on the right, with the proof seal overlaid"
    >
      {/* ambient colored bleed behind the floating window — tight,
          directly under the panel so no haze reads as dead canvas */}
      <div
        className="absolute inset-x-6 bottom-2 -z-10 h-16 translate-y-3 rounded-card-elevated bg-iris-glow/25 blur-2xl"
        aria-hidden="true"
      />

      {/* viewBox reserves a modest 55px below the frame for the
          grounding shadow — enough to read as floating, never haze */}
      <svg viewBox="0 0 1080 745" className="w-full" fill="none">
        <defs>
          {/* ── glass tint layers — sheen gradients over token fills ── */}
          {/* top-lit glass sheen: white 0.10 fading down (no tint shift) */}
          <linearGradient id="glass-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GLASS} stopOpacity="0.1" />
            <stop offset="0.5" stopColor={GLASS} stopOpacity="0.03" />
            <stop offset="1" stopColor={GLASS} stopOpacity="0" />
          </linearGradient>
          {/* chart area wash: teal signal 0.18 → mint, gone at baseline */}
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TEAL} stopOpacity="0.18" />
            <stop offset="0.65" stopColor={TEAL} stopOpacity="0.06" />
            <stop offset="1" stopColor={MINT} stopOpacity="0" />
          </linearGradient>
          {/* range-bar glass: top-lit cap over the iris-pulse fill */}
          <linearGradient id="bar-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GLASS} stopOpacity="0.35" />
            <stop offset="0.55" stopColor={GLASS} stopOpacity="0.08" />
            <stop offset="1" stopColor={GLASS} stopOpacity="0" />
          </linearGradient>
          {/* whisper dot-grid texture for the data-card pane */}
          <pattern id="dots-tex" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={GLASS} fillOpacity="0.05" />
          </pattern>
          {/* elevation blurs — soft but compact: the window floats
              just off the canvas without a haze halo */}
          <filter id="soft-blur" x="-30%" y="-300%" width="160%" height="700%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="tight-blur" x="-20%" y="-200%" width="140%" height="600%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ── Elevation — grounding shadows behind the window ─────── */}
        <ellipse cx="540" cy="718" rx="452" ry="18" fill={GLOW} fillOpacity="0.34" filter="url(#soft-blur)" />
        <ellipse cx="540" cy="698" rx="425" ry="10" fill={GLOW} fillOpacity="0.42" filter="url(#tight-blur)" />

        {/* ── Outer window ──────────────────────────────────── */}
        <rect
          x="1.5"
          y="1.5"
          width="1077"
          height="687"
          rx="26"
          fill={PANEL}
          stroke={LILAC}
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        {/* top-lit sheen + top edge catching light */}
        <rect x="1.5" y="1.5" width="1077" height="687" rx="26" fill="url(#glass-top)" />
        <path
          d={edgeLight(1.5, 1.5, 1077, 44)}
          stroke={GLASS}
          strokeOpacity="0.28"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* ── Left profile sidebar (300/1080 ≈ 28%) ──────────── */}
        <rect
          x="24"
          y="24"
          width="300"
          height="642"
          rx="20"
          fill={PANEL}
          stroke={LILAC}
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
        <rect x="24" y="24" width="300" height="642" rx="20" fill="url(#glass-top)" />
        <path
          d={edgeLight(24, 24, 300, 26)}
          stroke={GLASS}
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* header — mini ECG + wordmark (impilo logo signature) */}
        <motion.g {...draw(0)}>
          <path
            d="M 52 52 h 9 l 3 -8 l 5 14 l 4 -10 l 3 4 h 11"
            stroke={MINT}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="97" y="58" fill={INK} fontSize="16" fontWeight="600">
            cohort
          </text>
          <path d="M 52 84 H 296" stroke={LILAC} strokeOpacity="0.25" strokeWidth="1.5" />
        </motion.g>

        {/* avatar + name + meta */}
        <motion.g {...draw(0)}>
          <circle cx="100" cy="140" r="36" fill={RAISE} stroke={LILAC} strokeOpacity="0.45" strokeWidth="1.5" />
          {/* glass arc catching light on the avatar dome */}
          <path
            d="M 73 116 A 36 36 0 0 1 127 116"
            stroke={GLASS}
            strokeOpacity="0.2"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="129" r="11" fill={INK} fillOpacity="0.9" />
          <path
            d="M 80 162 C 86 148 114 148 120 162"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <text x="152" y="132" fill={INK} fontSize="19" fontWeight="600">
            R. •••••
          </text>
          <text x="152" y="156" fill={LILAC} fontSize="12.5" fontWeight="500" letterSpacing="0.08em">
            MY RECORD
          </text>
        </motion.g>

        {/* privacy chip */}
        <motion.g {...draw(1)}>
          <rect x="52" y="190" width="244" height="38" rx="19" fill={MINT} fillOpacity="0.1" stroke={MINT} strokeOpacity="0.4" strokeWidth="1.5" />
          <circle cx="72" cy="209" r="4" fill={MINT} />
          <text x="88" y="214" fill={MINT} fontSize="13" fontWeight="600" letterSpacing="0.04em">
            STAYS ON THIS DEVICE
          </text>
        </motion.g>

        {/* record rows — values masked as bars (etched glass panes) */}
        <motion.g {...draw(2)}>
          {RECORDS.map((r, i) => {
            const y = 254 + i * 58;
            return (
              <g key={r.k}>
                <rect x="52" y={y} width="244" height="46" rx="12" fill={FIELD} stroke={LILAC} strokeOpacity="0.28" strokeWidth="1.5" />
                <rect x="52" y={y} width="244" height="46" rx="12" fill={GLASS} fillOpacity="0.05" />
                <path
                  d={edgeLight(52, y, 244, 12)}
                  stroke={GLASS}
                  strokeOpacity="0.14"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text x="70" y={y + 28} fill={LILAC} fontSize="12.5" fontWeight="600" letterSpacing="0.1em">
                  {r.k}
                </text>
                <rect x={280 - r.w} y={y + 17} width={r.w} height="11" rx="5.5" fill={SOFT} fillOpacity="0.75" />
              </g>
            );
          })}
        </motion.g>

        {/* recent checks list */}
        <motion.g {...draw(3)}>
          <text x="52" y="510" fill={LILAC} fontSize="12" fontWeight="600" letterSpacing="0.14em">
            RECENT CHECKS
          </text>
          {[0, 1, 2].map((i) => {
            const y = 528 + i * 42;
            return (
              <g key={i}>
                <rect x="52" y={y} width="15" height="18" rx="3" stroke={TEAL} strokeWidth="1.5" />
                <path d={`M 55.5 ${y + 9} l 3 3 l 5 -6`} stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="80" y={y + 4} width={150 - i * 26} height="9" rx="4.5" fill={INK} fillOpacity="0.5" />
                <rect x="246" y={y + 4} width="40" height="9" rx="4.5" fill={SOFT} fillOpacity="0.35" />
              </g>
            );
          })}
        </motion.g>

        {/* ── Right main area ────────────────────────────────── */}
        {/* Tab pills — active surface carries the stronger edge light */}
        <motion.g {...draw(1)}>
          {TABS.map((t, i) => {
            const active = t === "PROOF";
            const x = 348 + i * 166;
            return (
              <g key={t}>
                <rect
                  x={x}
                  y="28"
                  width="154"
                  height="42"
                  rx="21"
                  fill={active ? RAISE : FIELD}
                  stroke={LILAC}
                  strokeOpacity={active ? 0.6 : 0.25}
                  strokeWidth="1.5"
                />
                <rect x={x} y="28" width="154" height="42" rx="21" fill={GLASS} fillOpacity={active ? 0.08 : 0.05} />
                <path
                  d={edgeLight(x, 28, 154, 14)}
                  stroke={GLASS}
                  strokeOpacity={active ? 0.22 : 0.12}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text
                  x={x + 77}
                  y="54"
                  textAnchor="middle"
                  fill={active ? INK : LILAC}
                  fontSize="13.5"
                  fontWeight="600"
                  letterSpacing="0.08em"
                >
                  {t}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* Metric pills */}
        <motion.g {...draw(2)}>
          {METRICS.map((m, i) => {
            const x = 348 + i * 142;
            return (
              <g key={m}>
                <rect x={x} y="92" width="130" height="36" rx="18" fill={FIELD} stroke={LILAC} strokeOpacity="0.25" strokeWidth="1.5" />
                <rect x={x} y="92" width="130" height="36" rx="18" fill={GLASS} fillOpacity="0.05" />
                <path
                  d={edgeLight(x, 92, 130, 14)}
                  stroke={GLASS}
                  strokeOpacity="0.16"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx={x + 19} cy="110" r="3.5" fill={TEAL} />
                <text x={x + 33} y="115" fill={LILAC} fontSize="12.5" fontWeight="600" letterSpacing="0.04em">
                  {m}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* Main data card — glass pane: sheen + dot-grid + edge light */}
        <motion.g {...draw(3)}>
          <rect x="348" y="148" width="708" height="352" rx="20" fill={PANEL} stroke={LILAC} strokeOpacity="0.35" strokeWidth="1.5" />
          <rect x="348" y="148" width="708" height="352" rx="20" fill="url(#glass-top)" />
          <rect x="348" y="148" width="708" height="352" rx="20" fill="url(#dots-tex)" />
          <path
            d={edgeLight(348, 148, 708, 34)}
            stroke={GLASS}
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <text x="382" y="192" fill={LILAC} fontSize="13" fontWeight="600" letterSpacing="0.14em">
            TRIAL MATCH CONFIDENCE
          </text>
          {/* big numeral — softly glowing, floating on the glass */}
          <g className="glow-soft">
            <text x="380" y="286" fill={SOFT} fontSize="94" fontWeight="600" letterSpacing="-0.02em">
              94%
            </text>
          </g>
          <text x="600" y="278" fill={LILAC} fontSize="16" fontWeight="500">
            NCT06218473
          </text>
          <text x="600" y="304" fill={LILAC} fillOpacity="0.75" fontSize="13" fontWeight="500">
            7.3.25 — 3.23.26
          </text>

          {/* baseline */}
          <path d="M 382 468 H 700" stroke={LILAC} strokeOpacity="0.3" strokeWidth="1.5" />

          {/* gradient area wash beneath the curve */}
          <motion.path
            d={AREA_MAIN}
            fill="url(#area-grad)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.75, duration: 1.1, ease: EASE }}
          />

          {/* range bars — staggered grow from center, glass-lit */}
          {RANGES.map((b, i) => {
            const grow = {
              initial: reduce ? false : { height: 0, y: b.y + b.h / 2 },
              animate: { height: b.h, y: b.y },
              transition: { delay: 1.1 + i * 0.06, duration: 0.6, ease: EASE },
            };
            return (
              <g key={b.x}>
                <motion.rect x={b.x} width="7" rx="3.5" fill={RAISE} {...grow} />
                <motion.rect x={b.x} width="7" rx="3.5" fill="url(#bar-sheen)" {...grow} />
              </g>
            );
          })}

          {/* light echo curve (impilo dual-line signature) */}
          <motion.path
            d={LINE_ECHO}
            stroke={LILAC}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.5, duration: 1.2, ease: EASE }}
          />

          {/* main curve — smooth Bézier with cyan bleed */}
          <motion.path
            d={LINE_MAIN}
            className="glow-cyan"
            stroke={TEAL}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.4, duration: 1.2, ease: EASE }}
          />

          {/* data points — glowing dots with radar-ping halos */}
          {DOTS.map((p, i) => (
            <g key={p.x}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill={TEAL}
                style={{ transformBox: "fill-box" }}
                initial={reduce ? false : { opacity: 0 }}
                animate={reduce ? { opacity: 0.18 } : { opacity: [0.3, 0], scale: [1, 1.5] }}
                transition={
                  reduce
                    ? { duration: 0.4 }
                    : { duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 2.1 + i * 0.28 }
                }
              />
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill={SOFT}
                style={{ transformBox: "fill-box" }}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.25 + i * 0.06, duration: 0.4, ease: EASE }}
              />
            </g>
          ))}

          {/* x-axis date labels */}
          {DATE_LABELS.map((l) => (
            <text key={l.t} x={l.x} y="492" textAnchor="middle" fill={LILAC} fillOpacity="0.7" fontSize="11.5" fontWeight="500">
              {l.t}
            </text>
          ))}

          {/* verified criteria rail — where the numbers live */}
          <text x="736" y="328" fill={LILAC} fontSize="11.5" fontWeight="600" letterSpacing="0.12em">
            VERIFIED CRITERIA
          </text>
          {CRITERIA.map((c, k) => {
            const y = 350 + k * 36;
            return (
              <g key={c}>
                <circle cx="743" cy={y + 7.5} r="7.5" fill={MINT} fillOpacity="0.08" stroke={MINT} strokeWidth="1.5" />
                <path d={`M 739.5 ${y + 7} l 2.5 2.5 l 4.5 -5.5`} stroke={MINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <text x="762" y={y + 12} fill={INK} fillOpacity="0.85" fontSize="13" fontWeight="500">
                  {c}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* bottom strip — share card (glass pane) */}
        <motion.g {...draw(4)}>
          <rect x="348" y="524" width="708" height="142" rx="20" fill={FIELD} stroke={LILAC} strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="348" y="524" width="708" height="142" rx="20" fill="url(#glass-top)" />
          <path
            d={edgeLight(348, 524, 708, 34)}
            stroke={GLASS}
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect x="382" y="556" width="210" height="12" rx="6" fill={INK} fillOpacity="0.55" />
          <rect x="382" y="582" width="330" height="9" rx="4.5" fill={LILAC} fillOpacity="0.35" />
          <rect x="382" y="602" width="260" height="9" rx="4.5" fill={LILAC} fillOpacity="0.25" />
          {/* proof seal — rotating dashed ring, mint-glowed */}
          <g className="glow-mint" transform="translate(972, 595)">
            <circle
              r="27"
              fill="none"
              stroke={MINT}
              strokeWidth="2"
              strokeDasharray="4 6"
              className="ring-spin"
              style={{ transformBox: "fill-box" }}
            />
            <circle r="17" fill={MINT} fillOpacity="0.14" />
            <path d="M -6 0 l 4 4 l 8 -8" stroke={MINT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <text x="930" y="590" textAnchor="end" fill={MINT} fontSize="13.5" fontWeight="600" letterSpacing="0.08em">
            PROOF #P-2941
          </text>
          <text x="930" y="612" textAnchor="end" fill={LILAC} fontSize="12" fontWeight="500">
            VERIFIED · NEVER REVEALS YOUR RECORD
          </text>
        </motion.g>

        {/* lilac flourish curve (impilo signature) */}
        <motion.path
          d="M 32 678 C 120 670 200 684 290 676"
          stroke={LILAC}
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.6, duration: 1.1, ease: EASE }}
        />
      </svg>
    </motion.div>
  );
}
