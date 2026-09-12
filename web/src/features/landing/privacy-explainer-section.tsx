"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Database, LockKeyhole, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { LineReveal } from "@/components/brand/line-reveal";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";

/**
 * PRIVACY EXPLAINER — the signature COHORT boundary diagram (dark, veiled).
 * Facts stay private → private proof → public result. The user's own
 * data is rendered as masked rows; the public record is fully legible.
 * The diagram is staged like every Impilo dark band: film grain over the
 * veil, a pool of veil light behind the diagram with a cyan breath on
 * the public side and lilac behind the headline, the two panels reading
 * as dark glass (the glow bleeds through them), mint/cyan light bleeding
 * off the proof nodes, and one contact shadow grounding the whole
 * floating cluster. Followed by the WHITE-GLOVE band: the light
 * compliance-badge close-out of the privacy story (impilo's white-glove
 * + badge-chip moment).
 */

const GUARANTEES = [
  {
    icon: ShieldCheck,
    label: "On-device answers",
  },
  {
    icon: MonitorSmartphone,
    label: "On-device only",
  },
  {
    icon: LockKeyhole,
    label: "Zero-knowledge proofs",
  },
  {
    icon: Database,
    label: "ClinicalTrials.gov sourced",
  },
];

export function PrivacyExplainerSection() {
  const reduce = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <SectionShell
      id="privacy"
      veil
      aria-labelledby="privacy-heading"
      className="overflow-hidden"
    >
      {/* Atmosphere — film grain + spotlight staging: the boundary
          diagram floats in a pool of veil light, cyan bleeds in from
          the public side, lilac sits behind the headline. */}
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-lilac top-[0%] left-1/2 h-48 w-[480px] -translate-x-1/2 opacity-80"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-veil top-[44%] left-1/2 h-[360px] w-[min(92%,700px)] -translate-x-1/2"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-cyan top-[54%] left-[67%] h-52 w-52 opacity-60"
        aria-hidden="true"
      />

      <SectionContent className="relative">
        <motion.div {...reveal(0)} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Privacy, visibly</Eyebrow>
          <LineReveal
            as="h2"
            id="privacy-heading"
            className="mt-4 text-heading font-semibold text-cloud-white"
            delay={0.05}
          >
            <span>Your record</span>
            <span>stays yours.</span>
          </LineReveal>
          <p className="mt-5 text-body text-pearl/80">
            One picture worth remembering: your facts never cross the line —
            only the proof does.
          </p>
        </motion.div>

        <div className="relative isolate mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* ONE contact shadow — the soft ellipse grounding the whole
              floating diagram a few millimeters above the canvas. */}
          <div
            className="contact-shadow absolute -bottom-7 left-1/2 -z-10 h-14 w-[74%] -translate-x-1/2"
            aria-hidden="true"
          />

          {/* YOUR HEALTH DATA — masked (dark glass panel) */}
          <motion.div
            {...reveal(0.08)}
            className="glass-panel relative rounded-card p-6 sm:p-8"
          >
            {/* top-edge highlight — the rim catching the staged light */}
            <span
              className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
              aria-hidden="true"
            />
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-lilac-mist">
              Your health data
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { label: "Age", value: "•••" },
                { label: "Conditions", value: "•••" },
                { label: "Medications", value: "•••" },
                { label: "Lab values", value: "•••" },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-field border border-iris-border/50 bg-deep-iris/40 px-4 py-3"
                >
                  <span className="text-body-sm text-pearl/75">{row.label}</span>
                  <span
                    className="text-body-sm font-semibold tracking-[0.3em] text-cloud-white/90"
                    aria-label="masked"
                  >
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="glow-mint mt-6 inline-flex items-center gap-2 rounded-pill border border-mint-vital/35 bg-mint-vital/10 px-4 py-2 text-caption font-semibold text-mint-vital">
              <span className="pulse-mint h-1.5 w-1.5 rounded-full bg-mint-vital" aria-hidden="true" />
              Stays on your device
            </p>
          </motion.div>

          {/* The proof column */}
          <motion.div
            {...reveal(0.16)}
            className="flex flex-row items-center justify-center gap-3 lg:w-44 lg:flex-col"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 56" className="h-14 w-6 rotate-90 lg:rotate-0 lg:h-14 lg:w-6">
              <path
                d="M 12 4 V 44"
                stroke="var(--color-lilac-mist)"
                strokeWidth="1.6"
                className={reduce ? undefined : "flow-dash"}
                opacity="0.8"
              />
              <path d="M 8 40 L 12 47 L 16 40" fill="none" stroke="var(--color-lilac-mist)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </svg>
            <span className="glow-cyan rounded-pill border border-clinical-cyan/50 bg-clinical-cyan/10 px-4 py-2 text-caption font-semibold text-clinical-cyan">
              Private proof
            </span>
            <svg viewBox="0 0 24 56" className="h-14 w-6 rotate-90 lg:rotate-0 lg:h-14 lg:w-6">
              <g className="glow-mint">
                <path
                  d="M 12 4 V 44"
                  stroke="var(--color-mint-vital)"
                  strokeWidth="1.6"
                  className={reduce ? undefined : "flow-dash"}
                  opacity="0.85"
                />
                <path d="M 8 40 L 12 47 L 16 40" fill="none" stroke="var(--color-mint-vital)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
            <span className="sr-only">Your data flows into a private proof, and only the proof flows to the public result.</span>
          </motion.div>

          {/* PUBLIC RESULT — legible (dark glass panel, mint-lit edge) */}
          <motion.div
            {...reveal(0.24)}
            className="glass-panel relative rounded-card p-6 sm:p-8"
          >
            {/* top-edge highlight — mint light catching the public rim */}
            <span
              className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-mint-vital/35 to-transparent"
              aria-hidden="true"
            />
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-mint-vital">
              Public result
            </p>
            <ul className="mt-6 space-y-4">
              <li className="flex items-center justify-between rounded-field border border-iris-border/50 bg-deep-iris/40 px-4 py-3">
                <span className="text-body-sm text-pearl/75">Eligibility</span>
                <span className="glow-mint text-body-sm font-semibold text-mint-vital">Proven ✓</span>
              </li>
              <li className="flex items-center justify-between rounded-field border border-iris-border/50 bg-deep-iris/40 px-4 py-3">
                <span className="text-body-sm text-pearl/75">Trial</span>
                <span className="text-body-sm font-semibold text-cloud-white">NCT06218473</span>
              </li>
              <li className="flex items-center justify-between rounded-field border border-iris-border/50 bg-deep-iris/40 px-4 py-3">
                <span className="text-body-sm text-pearl/75">Nullifier</span>
                <span className="text-body-sm font-semibold text-clinical-cyan">nul_•••</span>
              </li>
              <li className="flex items-center justify-between rounded-field border border-iris-border/50 bg-deep-iris/40 px-4 py-3">
                <span className="text-body-sm text-pearl/75">Verified at</span>
                <span className="text-body-sm font-semibold text-cloud-white">timestamp</span>
              </li>
            </ul>
            <p className="glow-cyan mt-6 inline-flex items-center gap-2 rounded-pill border border-clinical-cyan/40 bg-clinical-cyan/10 px-4 py-2 text-caption font-semibold text-clinical-cyan">
              Only what the site needs
            </p>
          </motion.div>
        </div>

        {/* VERIFIED without REVEALED */}
        <motion.div {...reveal(0.3)} className="mt-12 text-center">
          <p className="text-heading-sm font-semibold text-cloud-white">
            <span className="glow-mint text-mint-vital">Verified</span>
            <span className="text-pearl/50"> — without </span>
            <span className="relative text-lilac-mist">
              revealed
              <svg
                viewBox="0 0 120 12"
                className="absolute -bottom-1 left-0 w-full"
                aria-hidden="true"
              >
                <path d="M 2 8 Q 30 2 60 7 T 118 5" stroke="var(--color-lilac-mist)" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
              </svg>
            </span>
            .
          </p>
          <p className="mt-4 text-body text-pearl/70">
            Facts stay private. Verification becomes public.
          </p>
        </motion.div>
      </SectionContent>
    </SectionShell>
  );
}

/**
 * WHITE GLOVE — the light close-out of the privacy story. Impilo keeps
 * this moment minimal: an ink headline on Pearl, one short paragraph,
 * then a row of compliance chips (thin ink hairline border, badge icon,
 * small caps label in ink/60). Whisper atmosphere: grain + a faint
 * indigo pool behind the copy; chips lift on hover.
 */
export function WhiteGloveSection() {
  const reduce = useReducedMotion();

  return (
    <SectionShell
      tone="light"
      aria-labelledby="white-glove-heading"
      className="overflow-hidden"
    >
      {/* Whisper atmosphere — grain + one faint indigo pool. */}
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-veil top-[12%] left-1/2 h-56 w-[520px] -translate-x-1/2 opacity-45"
        aria-hidden="true"
      />

      <SectionContent className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <Eyebrow tone="ink">White-glove privacy</Eyebrow>
          <h2
            id="white-glove-heading"
            className="mt-4 text-heading font-semibold text-iris-ink"
          >
            Privacy, handled end to end.
          </h2>
          <p className="mt-5 text-body text-iris-ink/70">
            Every layer of COHORT is built so your record never becomes our
            product — the check runs on your device, the proof stands on its
            own, and the public ledger never learns more than it needs.
          </p>
        </motion.div>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {GUARANTEES.map((badge, i) => (
            <motion.li
              key={badge.label}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{
                duration: 0.55,
                delay: 0.1 + i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-flex"
            >
              {/* card-lift lives on an inner wrapper so the entrance
                  motion's inline transform never fights the CSS hover.
                  Chips are raised white pills — soft ink contact shadow
                  + the specular top edge of a lit tile. */}
              <div className="card-lift inline-flex items-center gap-2.5 rounded-pill border border-iris-ink/15 bg-white px-4 py-2.5 shadow-[0_8px_20px_-10px_rgba(35,34,101,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint-vital/10"
                  aria-hidden="true"
                >
                  <badge.icon
                    className="h-4 w-4 text-iris-ink/70"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-caption font-semibold uppercase tracking-[0.14em] text-iris-ink/60">
                  {badge.label}
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      </SectionContent>
    </SectionShell>
  );
}
