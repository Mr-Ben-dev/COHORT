"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  FlaskConical,
  LockKeyhole,
  Search,
  Share2,
} from "lucide-react";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";

/**
 * Product story — replaces the old 145vh pinned "focus on the science"
 * band. Five tight steps, no empty canvas, no crypto-first wording.
 */

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Problem",
    body: "Sites need eligible patients. Patients should not have to hand over a record to find out if they even qualify.",
  },
  {
    n: "02",
    icon: LockKeyhole,
    title: "Private match",
    body: "Typed trial rules stay public. Your age and mapped flags stay on this device.",
  },
  {
    n: "03",
    icon: FlaskConical,
    title: "Midnight proof",
    body: "1AM proves the typed fit in-browser. The chain sees a nullifier and a counter — not the record.",
  },
  {
    n: "04",
    icon: BadgeCheck,
    title: "Qualification",
    body: "Verified eligibility is a real Preprod transaction. A local preview is only a potential match.",
  },
  {
    n: "05",
    icon: Share2,
    title: "You choose next",
    body: "Keep private, share a public qualification, continue to the official study, or copy a public-safe packet.",
  },
] as const;

export function ProblemSection() {
  const reduce = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <SectionShell
      id="focus"
      veil
      aria-labelledby="focus-heading"
      className="overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <SectionContent className="relative">
        <motion.div {...reveal(0)} className="mx-auto max-w-3xl text-center">
          <Eyebrow>The product</Eyebrow>
          <h2
            id="focus-heading"
            className="mt-4 text-heading font-semibold text-cloud-white sm:text-heading-lg"
          >
            Discover research. Prove your fit. Keep the record.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body text-pearl/85">
            You can discover research opportunities and prove your fit
            without handing over your medical record.
          </p>
        </motion.div>

        <ol className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.n}
                {...reveal(0.08 + i * 0.06)}
                className="rounded-card border border-iris-border bg-cloud-white/[0.06] p-4 text-left"
              >
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
                  {step.n}
                </p>
                <span
                  className="mt-3 flex h-9 w-9 items-center justify-center rounded-full border border-iris-border text-mint-vital"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-body font-semibold text-cloud-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-body-sm leading-relaxed text-pearl/75">
                  {step.body}
                </p>
              </motion.li>
            );
          })}
        </ol>
      </SectionContent>
    </SectionShell>
  );
}
