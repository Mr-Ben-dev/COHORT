"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";
import { useCohortStore } from "@/state/cohort-store";

/**
 * THE TWO PATHS — the landing page's central argument, and the section
 * that replaced the old 145vh pinned "focus on the science" band (which
 * burned a screen and a half of canvas to say nothing).
 *
 * Left rail: how screening works today — the record travels first and the
 * answer comes back last. Right rail: COHORT — the answer is computed
 * where the facts already live, and only a proof travels.
 *
 * Both illustrations are original COHORT line-art on a shared 168x150
 * frame so the two rails align optically. Strokes draw on scroll via
 * pathLength; dashed runs rise as whole units (framer would clobber their
 * dasharray). Everything collapses to a static render under
 * prefers-reduced-motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type Reduce = boolean | null;

function draw(reduce: Reduce, delay: number, dur = 0.9) {
  return {
    initial: reduce ? false : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: "-60px" },
    transition: {
      pathLength: { duration: dur, delay, ease: EASE },
      opacity: { duration: 0.4, delay },
    },
  } as const;
}

function appear(reduce: Reduce, delay: number, dy = 6) {
  return {
    initial: reduce ? false : { opacity: 0, y: dy },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.6, delay, ease: EASE },
  } as const;
}

/* ── (a) Today: the record travels ──────────────────────────────
 * A legible record card is picked up, duplicated into two ghost
 * copies, and lands in a reviewer's tray. Every row stays readable
 * the whole way — that is the point of the drawing. */
function RecordTravelsArt({ reduce }: { reduce: Reduce }) {
  const stroke = "var(--color-lilac-mist)";
  return (
    <svg
      viewBox="0 0 300 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      role="img"
      aria-label="A readable patient record is copied twice as it travels from a person into a reviewer's tray."
    >
      {/* person */}
      <motion.circle
        cx="32"
        cy="44"
        r="11"
        stroke={stroke}
        strokeWidth="1.6"
        {...draw(reduce, 0.05, 0.6)}
      />
      <motion.path
        d="M 13 80 C 13 64 22 58 32 58 C 42 58 51 64 51 80"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        {...draw(reduce, 0.16, 0.7)}
      />

      {/* handover arrow */}
      <motion.path
        d="M 60 62 H 78"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        {...draw(reduce, 0.24, 0.35)}
      />
      <motion.path
        d="M 73 57 L 79 62 L 73 67"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 0.3, 0.3)}
      />

      {/* ghost copies behind the record — the duplication problem */}
      <motion.g {...appear(reduce, 0.62, 0)} opacity={0.3}>
        <rect
          x="106"
          y="20"
          width="56"
          height="76"
          rx="7"
          stroke={stroke}
          strokeWidth="1.3"
        />
        <rect
          x="98"
          y="26"
          width="56"
          height="76"
          rx="7"
          stroke={stroke}
          strokeWidth="1.3"
        />
      </motion.g>

      {/* the record itself — every row stays legible */}
      <motion.rect
        x="90"
        y="32"
        width="56"
        height="76"
        rx="7"
        stroke={stroke}
        strokeWidth="1.7"
        {...draw(reduce, 0.36, 0.8)}
      />
      {[48, 61, 74, 87].map((y, i) => (
        <motion.path
          key={y}
          d={`M 101 ${y} H ${i === 3 ? 126 : 135}`}
          stroke="var(--color-cyan-soft)"
          strokeWidth="1.8"
          strokeLinecap="round"
          {...draw(reduce, 0.56 + i * 0.07, 0.45)}
        />
      ))}

      {/* delivery arrow */}
      <motion.path
        d="M 170 70 H 190"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        {...draw(reduce, 0.9, 0.35)}
      />
      <motion.path
        d="M 185 65 L 191 70 L 185 75"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 0.96, 0.3)}
      />

      {/* reviewer tray */}
      <motion.path
        d="M 200 36 H 282 V 108 H 200 Z"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinejoin="round"
        {...draw(reduce, 1, 0.7)}
      />
      {[56, 70, 84].map((y, i) => (
        <motion.path
          key={y}
          d={`M 213 ${y} H ${i === 2 ? 256 : 269}`}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.72"
          {...draw(reduce, 1.14 + i * 0.07, 0.4)}
        />
      ))}

      {/* the wait */}
      <motion.path
        d="M 200 124 H 282"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.5"
        {...appear(reduce, 1.34, 4)}
      />
    </svg>
  );
}

/* ── (b) COHORT: only the proof travels ─────────────────────────
 * The same rows, now masked, sit behind a boundary the facts never
 * cross. A dashed run carries a sealed proof across it, and the
 * public side lights up mint. */
function ProofTravelsArt({ reduce }: { reduce: Reduce }) {
  const stroke = "var(--color-lilac-mist)";
  const mint = "var(--color-mint-vital)";
  return (
    <svg
      viewBox="0 0 300 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      role="img"
      aria-label="Masked health facts stay on a device behind a boundary line; only a sealed proof crosses to the public side, where a mint verified chip appears."
    >
      {/* device holding masked facts */}
      <motion.rect
        x="16"
        y="22"
        width="80"
        height="96"
        rx="11"
        stroke={stroke}
        strokeWidth="1.7"
        {...draw(reduce, 0.05, 0.8)}
      />
      {[44, 58, 72, 86].map((y, i) => (
        <motion.g key={y} {...appear(reduce, 0.35 + i * 0.07, 4)}>
          <rect
            x="28"
            y={y - 6}
            width="56"
            height="12"
            rx="6"
            stroke={stroke}
            strokeWidth="1.1"
            opacity="0.45"
          />
          {[0, 1, 2, 3].map((d) => (
            <circle
              key={d}
              cx={40 + d * 10}
              cy={y}
              r="2"
              fill={stroke}
              opacity="0.75"
            />
          ))}
        </motion.g>
      ))}
      {/* lock hasp on the device */}
      <motion.path
        d="M 48 108 V 102 A 8 8 0 0 1 64 102 V 108"
        stroke={mint}
        strokeWidth="1.6"
        strokeLinecap="round"
        {...draw(reduce, 0.72, 0.5)}
      />

      {/* the boundary the facts never cross */}
      <motion.path
        d="M 150 8 V 132"
        stroke="var(--color-clinical-cyan)"
        strokeWidth="1.4"
        strokeDasharray="5 7"
        opacity="0.75"
        {...appear(reduce, 0.5, 12)}
      />

      {/* proof seal riding the boundary */}
      <motion.circle
        cx="150"
        cy="66"
        r="20"
        stroke={mint}
        strokeWidth="1.7"
        {...draw(reduce, 0.75, 0.8)}
      />
      <motion.circle
        cx="150"
        cy="66"
        r="27"
        stroke={mint}
        strokeWidth="1.2"
        strokeDasharray="6 9"
        opacity="0.6"
        className={reduce ? undefined : "ring-spin"}
        style={{ transformBox: "fill-box" }}
        {...appear(reduce, 0.95, 0)}
      />
      <motion.path
        d="M 141 66 L 147.5 72.5 L 160 59"
        stroke={mint}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 1.05, 0.4)}
      />

      {/* only the proof crosses */}
      <motion.path
        d="M 182 66 H 204"
        stroke={mint}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="5 6"
        opacity="0.85"
        {...appear(reduce, 1.15, 0)}
      />

      {/* public side: the verified chip */}
      <motion.rect
        x="208"
        y="40"
        width="76"
        height="52"
        rx="9"
        stroke={mint}
        strokeWidth="1.7"
        {...draw(reduce, 1.2, 0.7)}
      />
      <motion.path
        d="M 222 60 L 230 68 L 246 51"
        stroke={mint}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 1.35, 0.4)}
      />
      <motion.path
        d="M 222 79 H 270"
        stroke={mint}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
        {...draw(reduce, 1.45, 0.3)}
      />
      {/* nothing else follows it across */}
      <motion.path
        d="M 208 112 H 284"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.38"
        {...appear(reduce, 1.5, 4)}
      />
    </svg>
  );
}

const TODAY = [
  "You hand over a record to find out if you even qualify.",
  "Copies spread across vendors, portals, and inboxes.",
  "A coordinator reads your history before anyone says yes.",
  "You wait — and you cannot take the record back.",
];

const COHORT = [
  "Public study rules meet your facts on your own device.",
  "Midnight proves the typed match. The facts stay put.",
  "Verified eligibility becomes a public, factless record.",
  "You decide what happens next — keep, share, or continue.",
];

function Rail({
  tone,
  kicker,
  title,
  verdict,
  items,
  art,
  delay,
  reduce,
}: {
  tone: "muted" | "vital";
  kicker: string;
  title: string;
  verdict: string;
  items: readonly string[];
  art: React.ReactNode;
  delay: number;
  reduce: Reduce;
}) {
  const vital = tone === "vital";
  return (
    <motion.div
      {...appear(reduce, delay, 20)}
      className={[
        "relative flex h-full flex-col rounded-card border p-6 sm:p-7",
        vital
          ? "border-mint-vital/35 bg-cloud-white/[0.07] shadow-[0_24px_60px_-40px_rgba(92,255,177,0.55)]"
          : "border-iris-border/70 bg-cloud-white/[0.03]",
      ].join(" ")}
    >
      <p
        className={[
          "text-caption font-semibold uppercase tracking-[0.18em]",
          vital ? "text-mint-vital" : "text-lilac-mist/75",
        ].join(" ")}
      >
        {kicker}
      </p>
      <h3 className="mt-2 text-subheading font-semibold text-cloud-white sm:text-[24px]">
        {title}
      </h3>

      <div
        className={[
          "mt-5 aspect-[300/140] w-full rounded-field border p-3",
          vital
            ? "border-mint-vital/20 bg-deep-iris/40"
            : "border-iris-border/50 bg-deep-iris/30",
        ].join(" ")}
      >
        {art}
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <motion.li
            key={item}
            {...appear(reduce, delay + 0.12 + i * 0.06, 8)}
            className="flex gap-3 text-body-sm leading-relaxed text-pearl/80"
          >
            <span
              className={[
                "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                vital ? "bg-mint-vital" : "bg-lilac-mist/50",
              ].join(" ")}
              aria-hidden="true"
            />
            {item}
          </motion.li>
        ))}
      </ul>

      <p
        className={[
          "mt-6 rounded-field border px-4 py-3 text-body-sm font-semibold",
          vital
            ? "border-mint-vital/30 bg-mint-vital/10 text-mint-vital"
            : "border-iris-border/60 bg-deep-iris/40 text-lilac-mist",
        ].join(" ")}
      >
        {verdict}
      </p>
    </motion.div>
  );
}

export function ProblemSection() {
  const reduce = useReducedMotion();
  const navigate = useCohortStore((s) => s.navigate);

  return (
    <SectionShell
      id="focus"
      veil
      aria-labelledby="focus-heading"
      className="overflow-hidden"
    >
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-veil top-[6%] left-1/2 h-[320px] w-[min(92%,720px)] -translate-x-1/2 opacity-60"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-cyan top-[42%] left-[72%] h-56 w-56 opacity-45"
        aria-hidden="true"
      />

      <SectionContent className="relative">
        <motion.div
          {...appear(reduce, 0, 24)}
          className="mx-auto max-w-3xl text-center"
        >
          <Eyebrow>The product</Eyebrow>
          <h2
            id="focus-heading"
            className="mt-4 text-heading font-semibold text-cloud-white sm:text-heading-lg"
          >
            Two ways to find out if you qualify.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body text-pearl/85">
            You can discover research opportunities and prove your fit
            without handing over your medical record. One of these paths
            asks for the record first. The other never asks at all.
          </p>
        </motion.div>

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr]">
          <Rail
            tone="muted"
            kicker="How screening works today"
            title="The record travels."
            verdict="Your record leaves first. The answer comes last."
            items={TODAY}
            art={<RecordTravelsArt reduce={reduce} />}
            delay={0.06}
            reduce={reduce}
          />

          {/* the pivot between the two rails */}
          <motion.div
            {...appear(reduce, 0.18, 0)}
            className="flex items-center justify-center lg:w-14"
            aria-hidden="true"
          >
            <span className="rounded-pill border border-iris-border/70 bg-deep-iris/60 px-3 py-1 text-caption font-semibold uppercase tracking-[0.18em] text-lilac-mist">
              or
            </span>
          </motion.div>

          <Rail
            tone="vital"
            kicker="How COHORT works"
            title="Only the proof travels."
            verdict="The answer comes first. Your record never leaves."
            items={COHORT}
            art={<ProofTravelsArt reduce={reduce} />}
            delay={0.12}
            reduce={reduce}
          />
        </div>

        <motion.div
          {...appear(reduce, 0.3, 16)}
          className="mt-10 flex flex-col items-center gap-4 text-center"
        >
          <ol className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist">
            {[
              "Discover",
              "Private match",
              "Midnight proof",
              "Qualification",
              "You choose next",
            ].map((step, i, all) => (
              <li key={step} className="flex items-center gap-2.5">
                <span
                  className={
                    i === all.length - 1 ? "text-mint-vital" : undefined
                  }
                >
                  {step}
                </span>
                {i < all.length - 1 ? (
                  <span className="text-lilac-mist/40" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <PillButton
            size="lg"
            iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => navigate({ name: "trials" })}
          >
            Find a trial
          </PillButton>
        </motion.div>
      </SectionContent>
    </SectionShell>
  );
}
