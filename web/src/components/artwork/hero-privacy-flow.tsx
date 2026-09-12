"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * HERO ARTWORK — "Private Record Cluster".
 *
 * Impilo's "3D without a background" lighting recipe, applied:
 * - Devices float on three unsynced CSS phases (.float-a/.float-b/.float-c)
 *   — never glued to the canvas, never in sync (buoyant parallax feel).
 * - `.rim-light-faint` on each device group casts a cool white rim on the
 *   lit (top-left) edge plus a soft indigo depth shadow; `.glow-cyan` /
 *   `.glow-mint` bleed color off the proof accents.
 * - Back-face offset rects hint at board thickness (slight 3D without
 *   perspective distortion); specular glints — tiny cloud-white circles
 *   on the rounded top-left corners — and a top-edge highlight arc on
 *   the clipboard imply a single light source up-left.
 * - Stroke hierarchy: 2.1px device bodies vs 1–1.2px internal details.
 * - Blurred inner-atmosphere ellipses behind the devices (ambient
 *   occlusion) + lilac connectors that weave IN FRONT of one device and
 *   BEHIND another (pure document-order z-layering) for parallax depth.
 *
 * Story: the clipboard holds a public trial checklist, the phone holds
 * the masked record that never leaves the device — and the rotating
 * dashed proof ring's mint check is the only fact that crosses over.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const LILAC = "var(--color-lilac-mist)";
const TEAL = "var(--color-teal-signal)";
const MINT = "var(--color-mint-vital)";
const GLASS = "var(--color-cloud-white)";

/** Checklist rows on the clipboard — squares + masked line bars (no text). */
const CHECKLIST: { y: number; bar: number }[] = [
  { y: 108, bar: 88 },
  { y: 144, bar: 62 },
  { y: 180, bar: 96 },
  { y: 216, bar: 52 },
];

/** Masked record rows on the phone — pill-shaped redactions (no text). */
const RECORDS: { y: number; w: number }[] = [
  { y: 284, w: 86 },
  { y: 308, w: 58 },
  { y: 332, w: 72 },
];

export function HeroPrivacyFlow({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  /** Outlines draw themselves in, blueprint-style (0.2 → 1.0s). */
  const draw = (delay: number, duration = 0.95) => ({
    initial: reduce ? false : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { delay, duration, ease: EASE },
  });

  /** Content (glints, textures) fades in after the outlines — to a
   * target opacity so sub-faint elements land at their resting value. */
  const fadeTo = (delay: number, to: number, duration = 0.6) => ({
    initial: reduce ? false : { opacity: 0 },
    animate: { opacity: to },
    transition: { delay, duration, ease: EASE },
  });

  /** Full-strength content fade. */
  const fade = (delay: number) => fadeTo(delay, 1);

  return (
    <svg
      viewBox="0 0 400 480"
      fill="none"
      role="img"
      aria-label="Line-art illustration: a floating clipboard holds a clinical-trial checklist with a single mint check mark, a floating phone holds masked health-record rows that stay private, and a slowly rotating dashed proof ring carries the one verified mint check that ever leaves the device, joined by flowing connector lines."
      className={cn("h-auto w-full select-none", className)}
    >
      <defs>
        {/* Dotted UI-grid texture for the clipboard screen. */}
        <pattern
          id="hero-privacy-grid"
          width="13"
          height="13"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.1" cy="1.1" r="0.72" fill={LILAC} />
        </pattern>
        {/* Gaussian blur for the inner atmosphere (depth blobs). */}
        <filter
          id="hero-privacy-atmo"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      {/* ── Inner atmosphere — blurred ambient-occlusion blobs behind the
       * devices (the hero section's larger glow divs sit outside the SVG;
       * these smaller ones hug the cluster itself). ── */}
      <ellipse
        cx="150"
        cy="185"
        rx="106"
        ry="130"
        fill={LILAC}
        opacity="0.07"
        filter="url(#hero-privacy-atmo)"
      />
      <ellipse
        cx="298"
        cy="205"
        rx="84"
        ry="92"
        fill={TEAL}
        opacity="0.05"
        filter="url(#hero-privacy-atmo)"
      />

      {/* ── Ambient sweep curves (impilo's flowing background lines) ── */}
      <motion.path
        d="M -24 54 C 84 128 204 148 262 238 C 314 320 296 416 372 470"
        stroke={LILAC}
        strokeWidth="1"
        opacity="0.2"
        {...draw(0.2, 1.1)}
      />
      <motion.path
        d="M -16 30 C 118 84 244 116 322 214 C 382 288 362 376 408 442"
        stroke={LILAC}
        strokeWidth="1"
        opacity="0.13"
        {...draw(0.3, 1.05)}
      />

      {/* ── Clipboard — the public trial checklist (floats, phase A) ── */}
      <g className="float-a">
        <g className="rim-light-faint">
          {/* back face — offset outline hinting board thickness */}
          <motion.rect
            x="57"
            y="50"
            width="188"
            height="246"
            rx="18"
            stroke={LILAC}
            strokeWidth="1"
            opacity="0.32"
            {...draw(0.24, 0.9)}
          />
          {/* board */}
          <motion.rect
            x="52"
            y="44"
            width="188"
            height="246"
            rx="18"
            fill={GLASS}
            fillOpacity="0.05"
            stroke={LILAC}
            strokeWidth="2.1"
            strokeLinecap="round"
            {...draw(0.28, 1.0)}
          />
          {/* top-edge highlight — the light source catching the rim */}
          <motion.path
            d="M 56 55 C 62 48.5 70 46 82 45.2 C 96 44.5 112 44.5 128 44.7"
            stroke={GLASS}
            strokeWidth="2.4"
            strokeLinecap="round"
            {...fadeTo(0.95, 0.28, 0.8)}
          />
          {/* clip tab */}
          <motion.rect
            x="116"
            y="30"
            width="60"
            height="20"
            rx="7"
            fill={GLASS}
            fillOpacity="0.05"
            stroke={LILAC}
            strokeWidth="1.5"
            {...draw(0.45, 0.6)}
          />
          {/* specular glints — light hitting the rounded corners */}
          <motion.circle
            cx="57.5"
            cy="49.5"
            r="2.3"
            fill={GLASS}
            {...fadeTo(1.1, 0.8)}
          />
          <motion.circle
            cx="118.1"
            cy="32.1"
            r="2"
            fill={GLASS}
            {...fadeTo(1.15, 0.85)}
          />
          {/* hairline under the tab */}
          <motion.path
            d="M 80 88 H 212"
            stroke={LILAC}
            strokeWidth="1"
            opacity="0.3"
            {...draw(0.7, 0.45)}
          />
          {/* dotted UI grid — screen texture behind the rows */}
          <motion.rect
            x="78"
            y="100"
            width="140"
            height="124"
            rx="10"
            fill="url(#hero-privacy-grid)"
            {...fadeTo(1.05, 0.16, 0.8)}
          />
          {/* checkbox squares */}
          {CHECKLIST.map((row, i) => (
            <motion.rect
              key={row.y}
              x="80"
              y={row.y}
              width="15"
              height="15"
              rx="3.5"
              stroke={LILAC}
              strokeWidth="1.1"
              {...draw(0.6 + i * 0.08, 0.5)}
            />
          ))}
          {/* checklist content — masked line bars + two quiet lilac checks */}
          <motion.g {...fade(1.0)}>
            {CHECKLIST.map((row) => (
              <rect
                key={`bar-${row.y}`}
                x="105"
                y={row.y + 4.5}
                width={row.bar}
                height="6"
                rx="3"
                fill={LILAC}
                fillOpacity="0.3"
              />
            ))}
            <path
              d="M 83.6 152 l 3 3 l 6.2 -6.8"
              stroke={LILAC}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <path
              d="M 83.6 188 l 3 3 l 6.2 -6.8"
              stroke={LILAC}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </motion.g>
          {/* the one mint check — the verified criterion */}
          <motion.path
            d="M 83.6 116 l 3 3 l 6.2 -6.8"
            stroke={MINT}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...draw(0.98, 0.55)}
          />
        </g>
      </g>

      {/* ── Connector: checklist → phone. Runs IN FRONT of the clipboard
       * face, then dives BEHIND the phone body (document order). ── */}
      <motion.path
        d="M 174 272 C 196 281 216 288 232 298"
        stroke={LILAC}
        strokeWidth="1.3"
        opacity="0.38"
        strokeLinecap="round"
        {...draw(1.35, 0.7)}
      />
      {/* dim through-glass tail — seen faintly inside the phone screen,
       * ending behind the mint privacy pill */}
      <motion.path
        d="M 232 298 C 254 308 270 324 277 348 C 281 362 281 376 278 390"
        stroke={LILAC}
        strokeWidth="1.1"
        opacity="0.15"
        strokeLinecap="round"
        {...draw(1.45, 0.75)}
      />

      {/* ── Smartphone — the masked record (floats, phase B) ── */}
      <g className="float-b">
        <g className="rim-light-faint">
          {/* back face — thickness hint */}
          <motion.rect
            x="231.5"
            y="255.5"
            width="118"
            height="192"
            rx="17"
            stroke={LILAC}
            strokeWidth="1"
            opacity="0.3"
            {...draw(0.36, 0.95)}
          />
          {/* body */}
          <motion.rect
            x="226"
            y="250"
            width="118"
            height="192"
            rx="17"
            fill={GLASS}
            fillOpacity="0.05"
            stroke={LILAC}
            strokeWidth="2.1"
            {...draw(0.4, 1.0)}
          />
          {/* specular glint on the rounded top-left corner */}
          <motion.circle
            cx="231.4"
            cy="255.4"
            r="2.1"
            fill={GLASS}
            {...fadeTo(1.1, 0.8)}
          />
          {/* speaker + home indicator */}
          <motion.g {...fade(1.05)}>
            <rect
              x="268"
              y="260"
              width="34"
              height="4.5"
              rx="2.25"
              fill={LILAC}
              fillOpacity="0.35"
            />
            <rect
              x="264"
              y="426"
              width="42"
              height="4"
              rx="2"
              fill={LILAC}
              fillOpacity="0.3"
            />
          </motion.g>
          {/* masked record rows — redacted pills, never text */}
          {RECORDS.map((row, i) => (
            <motion.rect
              key={row.y}
              x="242"
              y={row.y}
              width={row.w}
              height="9"
              rx="4.5"
              fill={LILAC}
              fillOpacity="0.35"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.5, ease: EASE }}
            />
          ))}
          {/* the mint privacy pill — the record never leaves */}
          <motion.rect
            x="246"
            y="388"
            width="76"
            height="20"
            rx="10"
            fill={MINT}
            fillOpacity="0.07"
            stroke={MINT}
            strokeWidth="1.2"
            {...fade(1.3)}
          />
        </g>
      </g>

      {/* ── Connector: record → proof. Rises IN FRONT of the phone face,
       * then passes BEHIND the capsule and the ring (document order). ── */}
      <motion.path
        d="M 280 276 C 270 250 264 222 270 196 C 275 176 283 154 293 138"
        stroke={LILAC}
        strokeWidth="1.3"
        opacity="0.38"
        strokeLinecap="round"
        {...draw(1.5, 0.8)}
      />
      {/* dim through-glass tail — glides inside the ring toward the check */}
      <motion.path
        d="M 293 138 C 296 130 299 124 302 118"
        stroke={LILAC}
        strokeWidth="1.1"
        opacity="0.16"
        strokeLinecap="round"
        {...draw(1.62, 0.5)}
      />

      {/* ── The proof ring + capsule (floats, phase C) ── */}
      <g className="float-c">
        {/* echo ring — faint static orbit guide */}
        <motion.circle
          cx="318"
          cy="116"
          r="52"
          stroke={TEAL}
          strokeWidth="1"
          strokeDasharray="1.5 8"
          strokeLinecap="round"
          opacity="0.2"
          {...fadeTo(0.6, 0.2, 0.9)}
        />
        <motion.g
          initial={reduce ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
          style={{ transformOrigin: "318px 116px" }}
        >
          {/* rotating dashed ring — the private proof */}
          <circle
            cx="318"
            cy="116"
            r="43"
            fill={GLASS}
            fillOpacity="0.04"
            stroke={TEAL}
            strokeWidth="1.5"
            strokeDasharray="3 7"
            strokeLinecap="round"
            className="ring-spin glow-cyan"
            style={{ transformBox: "fill-box" }}
          />
          <circle cx="318" cy="73" r="2.2" fill={TEAL} opacity="0.9" />
          {/* the mint check — the only fact that crosses over */}
          <motion.path
            d="M 303 116 l 10 10 l 19 -20"
            stroke={MINT}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="glow-mint"
            {...draw(0.95, 0.55)}
          />
        </motion.g>
        {/* specular glint on the ring's upper-left curve */}
        <motion.circle
          cx="287.6"
          cy="85.6"
          r="1.9"
          fill={GLASS}
          {...fadeTo(1.0, 0.75)}
        />
        {/* capsule — single lilac accent fill */}
        <g transform="rotate(-26 262 197)">
          <motion.rect
            x="242"
            y="188.5"
            width="40"
            height="17"
            rx="8.5"
            fill={LILAC}
            stroke={LILAC}
            strokeWidth="1.2"
            initial={reduce ? false : { pathLength: 0, fillOpacity: 0 }}
            animate={{ pathLength: 1, fillOpacity: 0.14 }}
            transition={{ delay: 0.65, duration: 0.7, ease: EASE }}
          />
          <motion.path
            d="M 262 188.5 V 205.5"
            stroke={LILAC}
            strokeWidth="1.1"
            {...draw(0.8, 0.5)}
          />
        </g>
      </g>

      {/* ── Stethoscope — decorative curve, lower-left ── */}
      <g opacity="0.45">
        <motion.path
          d="M 90 330 C 86 314 92 302 100 294"
          stroke={LILAC}
          strokeWidth="1.4"
          strokeLinecap="round"
          {...draw(0.85, 0.7)}
        />
        <motion.path
          d="M 100 334 C 96 318 102 306 110 298"
          stroke={LILAC}
          strokeWidth="1.4"
          strokeLinecap="round"
          {...draw(0.9, 0.7)}
        />
        <motion.path
          d="M 94 332 C 88 378 118 404 148 398 C 178 392 186 418 176 444"
          stroke={LILAC}
          strokeWidth="1.4"
          strokeLinecap="round"
          {...draw(0.95, 1.05)}
        />
        <motion.circle
          cx="176"
          cy="452"
          r="10"
          stroke={LILAC}
          strokeWidth="1.4"
          {...draw(1.0, 0.6)}
        />
        <motion.g {...fade(1.15)}>
          <circle cx="101" cy="291" r="3" fill={LILAC} />
          <circle cx="111" cy="295" r="3" fill={LILAC} />
          <circle cx="176" cy="452" r="4" stroke={LILAC} strokeWidth="1.1" />
        </motion.g>
      </g>

      {/* ── Ambient accents — three tiny marks, nothing more ── */}
      <motion.g {...fade(1.2)}>
        <circle cx="34" cy="116" r="2" fill={LILAC} opacity="0.55" />
        <path
          d="M 26 246 h 12 M 32 240 v 12"
          stroke={LILAC}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="374" cy="210" r="2.2" fill={TEAL} opacity="0.55" />
      </motion.g>
    </svg>
  );
}
