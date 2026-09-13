"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * HERO CLUSTER — the full-height line-art backdrop anchored to the left
 * edge of the hero.
 *
 * The quality bar here is a hero where the illustration is atmosphere
 * rather than an object: enormous, monoline, low-contrast, and cropped by
 * the viewport so the composition clearly continues past the edge.
 * Everything is COHORT's own vocabulary — a record card whose rows stay
 * masked, a proof seal, a conduit carrying one sealed result out of the
 * cluster, a criteria clipboard — mixed with plain clinical objects so it
 * reads as medicine at a glance rather than as abstract geometry.
 *
 * The frame is 420×1080 because the hero column it fills is extremely
 * narrow-portrait (~645×1660). Authoring at that ratio matters: with
 * `slice`, a squarer viewBox gets its width cropped away and the right
 * half of the drawing silently disappears. Anything at negative x is
 * meant to fall off the screen.
 *
 * Strokes draw once on mount, two groups drift on their own idle cycles,
 * and the cluster takes a slow parallax rise as the hero scrolls away.
 * Under prefers-reduced-motion it renders statically at full opacity.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroCluster({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallax = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  const line = "var(--color-cloud-white)";
  const mint = "var(--color-mint-vital)";
  const cyan = "var(--color-clinical-cyan)";

  /** Stroke draw-in. Long, calm, staggered outward from the record card. */
  const draw = (delay: number, duration = 1.6, opacity = 0.3) =>
    ({
      initial: reduce ? false : { pathLength: 0, opacity: 0 },
      animate: { pathLength: 1, opacity },
      transition: {
        pathLength: { duration, delay, ease: EASE },
        opacity: { duration: 0.8, delay },
      },
    }) as const;

  const fade = (delay: number, opacity = 0.3) =>
    ({
      initial: reduce ? false : { opacity: 0 },
      animate: { opacity },
      transition: { duration: 1, delay, ease: EASE },
    }) as const;

  const spin = { transformBox: "fill-box" } as const;
  const drift = { transformBox: "fill-box", transformOrigin: "center" } as const;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <motion.div
        style={reduce ? undefined : { y: parallax }}
        className="h-full w-full"
      >
        <svg
          viewBox="0 0 420 1080"
          preserveAspectRatio="xMinYMid slice"
          fill="none"
          className="h-full w-full"
        >
          {/* ── conduit: one line threading the whole cluster, carrying a
               single sealed result down and out to the lock ── */}
          <motion.path
            d="M -30 46 C 96 74 158 132 172 216 C 188 314 132 360 146 432 C 162 512 250 546 292 604 C 330 656 330 712 296 756 C 250 814 178 828 156 884 C 138 930 176 986 250 1010"
            stroke={line}
            strokeWidth="1.6"
            strokeLinecap="round"
            {...draw(0.15, 3, 0.24)}
          />

          {/* ── capsule, tilted off the top-left edge ── */}
          <g transform="rotate(-34 60 96)">
            <motion.rect
              x="-32"
              y="64"
              width="184"
              height="64"
              rx="32"
              stroke={line}
              strokeWidth="1.6"
              {...draw(0.5, 1.4, 0.26)}
            />
            <motion.path
              d="M 60 64 V 128"
              stroke={line}
              strokeWidth="1.4"
              {...draw(0.9, 0.6, 0.24)}
            />
          </g>

          {/* ── thermometer, filling the upper-right gap ── */}
          <g transform="rotate(22 344 190)">
            <motion.rect
              x="326"
              y="84"
              width="34"
              height="188"
              rx="17"
              stroke={line}
              strokeWidth="1.6"
              {...draw(0.4, 1.6, 0.3)}
            />
            <motion.circle
              cx="343"
              cy="292"
              r="28"
              stroke={line}
              strokeWidth="1.6"
              {...draw(0.8, 1, 0.3)}
            />
            <motion.path
              d="M 343 264 V 150"
              stroke={cyan}
              strokeWidth="6"
              strokeLinecap="round"
              {...draw(1.2, 1.1, 0.42)}
            />
            {[128, 154, 180, 206].map((y, i) => (
              <motion.path
                key={y}
                d={`M 360 ${y} H ${i % 2 === 0 ? 382 : 374}`}
                stroke={line}
                strokeWidth="1.4"
                strokeLinecap="round"
                {...fade(0.95 + i * 0.08, 0.22)}
              />
            ))}
          </g>

          {/* ── the record card: masked rows, cropped by the viewport ── */}
          <g>
            <motion.rect
              x="-170"
              y="150"
              width="420"
              height="470"
              rx="46"
              stroke={line}
              strokeWidth="1.8"
              {...draw(0.1, 2.2, 0.34)}
            />
            {/* identity block — a face and a name that never leave */}
            <motion.g {...fade(0.55, 0.26)}>
              <circle
                cx="-100"
                cy="232"
                r="34"
                stroke={line}
                strokeWidth="1.6"
              />
              <path
                d="M -44 218 H 96 M -44 250 H 44"
                stroke={line}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </motion.g>
            {[314, 382, 450].map((y, i) => (
              <motion.g key={y} {...fade(0.7 + i * 0.12, 0.28)}>
                <rect
                  x="-130"
                  y={y}
                  width={i === 2 ? 210 : 268}
                  height="42"
                  rx="21"
                  stroke={line}
                  strokeWidth="1.4"
                />
                {[0, 1, 2, 3, 4].map((d) => (
                  <circle
                    key={d}
                    cx={-96 + d * 28}
                    cy={y + 21}
                    r="5"
                    fill={line}
                    opacity="0.5"
                  />
                ))}
              </motion.g>
            ))}
            {/* the one fact that is allowed to leave the device */}
            <motion.path
              d="M -130 540 H 60"
              stroke={mint}
              strokeWidth="4"
              strokeLinecap="round"
              {...draw(1.5, 1.1, 0.45)}
            />
          </g>

          {/* ── proof seal, riding over the card's right edge ── */}
          <g className={reduce ? undefined : "float-b"} style={drift}>
            <motion.circle
              cx="250"
              cy="404"
              r="96"
              stroke={line}
              strokeWidth="1.6"
              {...draw(0.35, 2.2, 0.26)}
            />
            <motion.circle
              cx="250"
              cy="404"
              r="126"
              stroke={cyan}
              strokeWidth="1.4"
              strokeDasharray="10 18"
              className={reduce ? undefined : "ring-spin"}
              style={spin}
              {...fade(0.9, 0.3)}
            />
            <motion.path
              d="M 216 406 L 240 430 L 288 378"
              stroke={mint}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              {...draw(1.2, 1, 0.55)}
            />
          </g>

          {/* ── stethoscope: the object that reads as medicine instantly ── */}
          <g className={reduce ? undefined : "float-a"} style={drift}>
            <motion.path
              d="M 4 646 C 4 742 74 788 128 788 C 186 788 244 738 244 664 V 620"
              stroke={line}
              strokeWidth="1.8"
              strokeLinecap="round"
              {...draw(0.65, 2.4, 0.3)}
            />
            <motion.path
              d="M 4 646 V 602 M 4 602 L -22 578 M 4 602 L 32 578"
              stroke={line}
              strokeWidth="1.6"
              strokeLinecap="round"
              {...draw(1.05, 1.2, 0.28)}
            />
            <motion.circle
              cx="244"
              cy="596"
              r="32"
              stroke={line}
              strokeWidth="1.8"
              {...draw(1.35, 1, 0.32)}
            />
            <motion.circle
              cx="244"
              cy="596"
              r="17"
              stroke={line}
              strokeWidth="1.4"
              {...draw(1.55, 0.8, 0.26)}
            />
          </g>

          {/* ── ECG thread ── */}
          <motion.path
            d="M -30 852 H 56 L 72 810 L 94 902 L 114 852 H 176"
            stroke={cyan}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...draw(1.35, 1.4, 0.4)}
          />

          {/* ── criteria clipboard, cropped by the bottom edge ── */}
          <g className={reduce ? undefined : "float-c"} style={drift}>
            <motion.rect
              x="86"
              y="908"
              width="286"
              height="330"
              rx="42"
              stroke={line}
              strokeWidth="1.8"
              {...draw(0.55, 2, 0.3)}
            />
            <motion.rect
              x="186"
              y="882"
              width="92"
              height="50"
              rx="19"
              stroke={line}
              strokeWidth="1.6"
              {...draw(0.95, 1, 0.3)}
            />
            {[992, 1064].map((y, i) => (
              <motion.g key={y} {...fade(1.05 + i * 0.14, 0.28)}>
                <rect
                  x="126"
                  y={y}
                  width="44"
                  height="44"
                  rx="14"
                  stroke={line}
                  strokeWidth="1.4"
                />
                <path
                  d={`M 194 ${y + 22} H ${i === 1 ? 292 : 336}`}
                  stroke={line}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </motion.g>
            ))}
            <motion.path
              d="M 137 1014 L 147 1024 L 163 1003"
              stroke={cyan}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              {...draw(1.55, 0.7, 0.5)}
            />
          </g>

          {/* ── the lock the conduit terminates in ── */}
          <motion.g {...fade(1.7, 0.3)}>
            <rect
              x="266"
              y="782"
              width="86"
              height="68"
              rx="20"
              stroke={line}
              strokeWidth="1.6"
            />
            <path
              d="M 287 782 V 764 A 22 22 0 0 1 331 764 V 782"
              stroke={line}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="309" cy="812" r="7" stroke={line} strokeWidth="1.6" />
          </motion.g>

          {/* ── scatter: quiet detail that keeps the large voids alive ── */}
          {[
            [352, 470],
            [46, 372],
            [368, 690],
            [92, 216],
          ].map(([x, y], i) => (
            <motion.path
              key={`${x}-${y}`}
              d={`M ${x - 10} ${y} H ${x + 10} M ${x} ${y - 10} V ${y + 10}`}
              stroke={line}
              strokeWidth="1.6"
              strokeLinecap="round"
              {...fade(1.5 + i * 0.1, 0.22)}
            />
          ))}
          {[
            [386, 566],
            [36, 942],
            [330, 916],
          ].map(([x, y], i) => (
            <motion.circle
              key={`${x}-${y}-dot`}
              cx={x}
              cy={y}
              r="4"
              fill={line}
              {...fade(1.65 + i * 0.1, 0.25)}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  );
}
