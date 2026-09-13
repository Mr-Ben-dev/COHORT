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
      viewBox="0 0 168 150"
      className="h-full w-full"
      fill="none"
      role="img"
      aria-label="A readable patient record is copied twice as it travels from a person into a reviewer's tray."
    >
      {/* person */}
      <motion.circle
        cx="24"
        cy="40"
        r="8"
        stroke={stroke}
        strokeWidth="1.4"
        {...draw(reduce, 0.05, 0.6)}
      />
      <motion.path
        d="M 10 66 C 10 55 17 51 24 51 C 31 51 38 55 38 66"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        {...draw(reduce, 0.16, 0.7)}
      />

      {/* ghost copies behind the record */}
      <motion.g {...appear(reduce, 0.55, 0)} opacity={0.28}>
        <rect
          x="70"
          y="24"
          width="46"
          height="58"
          rx="5"
          stroke={stroke}
          strokeWidth="1.2"
        />
        <rect
          x="64"
          y="30"
          width="46"
          height="58"
          rx="5"
          stroke={stroke}
          strokeWidth="1.2"
        />
      </motion.g>

      {/* the record itself — rows stay legible */}
      <motion.rect
        x="58"
        y="36"
        width="46"
        height="58"
        rx="5"
        stroke={stroke}
        strokeWidth="1.5"
        {...draw(reduce, 0.3, 0.8)}
      />
      {[48, 57, 66, 75].map((y, i) => (
        <motion.path
          key={y}
          d={`M 66 ${y} H ${i === 3 ? 88 : 96}`}
          stroke="var(--color-cyan-soft)"
          strokeWidth="1.5"
          strokeLinecap="round"
          {...draw(reduce, 0.5 + i * 0.07, 0.45)}
        />
      ))}

      {/* transfer arrows */}
      <motion.path
        d="M 42 58 H 54"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        {...draw(reduce, 0.24, 0.35)}
      />
      <motion.path
        d="M 108 62 H 122"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        {...draw(reduce, 0.82, 0.35)}
      />
      <motion.path
        d="M 117 57 L 123 62 L 117 67"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 0.9, 0.3)}
      />

      {/* reviewer tray */}
      <motion.path
        d="M 126 52 H 158 V 96 H 126 Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        {...draw(reduce, 0.95, 0.7)}
      />
      {[64, 74, 84].map((y, i) => (
        <motion.path
          key={y}
          d={`M 133 ${y} H 151`}
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.7"
          {...draw(reduce, 1.1 + i * 0.07, 0.4)}
        />
      ))}

      {/* waiting pulse under the tray */}
      <motion.path
        d="M 126 112 H 158"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="3 5"
        opacity="0.55"
        {...appear(reduce, 1.3, 4)}
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
      viewBox="0 0 168 150"
      className="h-full w-full"
      fill="none"
      role="img"
      aria-label="Masked health facts stay on a device behind a boundary line; only a sealed proof crosses to the public side, where a mint verified chip appears."
    >
      {/* device holding masked facts */}
      <motion.rect
        x="10"
        y="28"
        width="52"
        height="74"
        rx="8"
        stroke={stroke}
        strokeWidth="1.5"
        {...draw(reduce, 0.05, 0.8)}
      />
      {[46, 57, 68, 79].map((y, i) => (
        <motion.g key={y} {...appear(reduce, 0.35 + i * 0.07, 4)}>
          <rect
            x="18"
            y={y - 4}
            width="36"
            height="7"
            rx="3.5"
            stroke={stroke}
            strokeWidth="1"
            opacity="0.5"
          />
          {[0, 1, 2].map((d) => (
            <circle
              key={d}
              cx={24 + d * 6}
              cy={y - 0.5}
              r="1.4"
              fill={stroke}
              opacity="0.75"
            />
          ))}
        </motion.g>
      ))}
      {/* lock hasp on the device */}
      <motion.path
        d="M 30 94 V 90 A 6 6 0 0 1 42 90 V 94"
        stroke={mint}
        strokeWidth="1.4"
        strokeLinecap="round"
        {...draw(reduce, 0.7, 0.5)}
      />

      {/* the boundary the facts never cross */}
      <motion.path
        d="M 84 14 V 136"
        stroke="var(--color-clinical-cyan)"
        strokeWidth="1.2"
        strokeDasharray="4 6"
        opacity="0.75"
        {...appear(reduce, 0.5, 10)}
      />

      {/* proof seal riding the boundary */}
      <motion.circle
        cx="84"
        cy="65"
        r="15"
        stroke={mint}
        strokeWidth="1.5"
        {...draw(reduce, 0.75, 0.8)}
      />
      <motion.circle
        cx="84"
        cy="65"
        r="20"
        stroke={mint}
        strokeWidth="1.1"
        strokeDasharray="5 7"
        opacity="0.6"
        className={reduce ? undefined : "ring-spin"}
        style={{ transformBox: "fill-box" }}
        {...appear(reduce, 0.95, 0)}
      />
      <motion.path
        d="M 78 65 L 82.5 69.5 L 91 60"
        stroke={mint}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 1.05, 0.4)}
      />

      {/* only the proof crosses */}
      <motion.path
        d="M 100 65 H 118"
        stroke={mint}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity="0.85"
        {...appear(reduce, 1.15, 0)}
      />

      {/* public side: the verified chip */}
      <motion.rect
        x="120"
        y="48"
        width="40"
        height="34"
        rx="6"
        stroke={mint}
        strokeWidth="1.5"
        {...draw(reduce, 1.2, 0.7)}
      />
      <motion.path
        d="M 128 60 L 133 65 L 143 55"
        stroke={mint}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reduce, 1.35, 0.4)}
      />
      <motion.path
        d="M 128 73 H 152"
        stroke={mint}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.6"
        {...draw(reduce, 1.45, 0.3)}
      />
      {/* nothing else follows it across */}
      <motion.path
        d="M 120 104 H 160"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="3 5"
        opacity="0.4"
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
          "mt-5 h-[150px] w-full rounded-field border px-3 py-2",
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
