"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";

/**
 * HONESTY — "What COHORT will never do" on the Pearl light surface,
 * tightened to impilo minimalism: an ink headline, then plain rows
 * separated by hairline dividers — no cards. Each row carries the
 * destructive coral X in a tinted node (soft coral halo backdrop +
 * subtle inner ring) and the text stays ink/70. Rows breathe up 2px
 * on hover; a whisper of atmosphere (grain + one faint indigo pool
 * behind the headline) keeps the light section from reading flat.
 */

const LIMITS = [
  {
    title: "It doesn't certify your facts.",
    body: "COHORT verifies the eligibility computation — it does not independently certify that every self-reported medical fact is true. Sites still run their own screening.",
  },
  {
    title: "It doesn't store your record.",
    body: "There is no COHORT database of medical records to breach. Your answers live on your device for the check, then the proof stands on its own.",
  },
  {
    title: "It doesn't share your answers.",
    body: "The private check runs entirely where your answers live. Nothing you type into the check is transmitted to COHORT.",
  },
  {
    title: "It doesn't monetize your data.",
    body: "No ads, no data brokerage, no analytics on your answers. The only output is the proof you choose to publish.",
  },
  {
    title: "It doesn't pay a referral bounty.",
    body: "The live circuit records a uniqueness token, not an escrowed payment. A paid marketplace is coming next — it is not shown as live.",
  },
];

export function HonestySection() {
  const reduce = useReducedMotion();

  return (
    <SectionShell
      tone="light"
      id="honesty"
      aria-labelledby="honesty-heading"
      className="overflow-hidden"
    >
      {/* Whisper atmosphere — film grain + one faint indigo pool
          centered behind the heading. */}
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-veil top-[4%] left-1/2 h-[280px] w-[560px] -translate-x-1/2 opacity-40"
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
          <Eyebrow tone="ink">Honest by design</Eyebrow>
          <h2
            id="honesty-heading"
            className="mt-4 text-heading font-semibold text-iris-ink"
          >
            What COHORT will never do.
          </h2>
          <p className="mt-5 text-body text-iris-ink/70">
            A privacy product that oversells is a privacy product that
            fails. Here is exactly where the guarantee ends.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 max-w-3xl">
          <ul className="divide-y divide-iris-ink/[0.16]">
            {LIMITS.map((limit, i) => (
              <motion.li
                key={limit.title}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-12% 0px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group"
              >
                {/* card-lift-lite — the row breathes up 2px on hover.
                    The lift lives on this inner wrapper so the entrance
                    motion's inline transform never fights the CSS. */}
                <div className="flex gap-4 py-7 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 sm:gap-5 sm:py-8">
                  <span
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive inset-ring inset-ring-destructive/20"
                    aria-hidden="true"
                  >
                    {/* soft coral backdrop — a tinted halo the node
                        floats in, brightening as the row lifts */}
                    <span
                      className="absolute -inset-2 rounded-full bg-destructive/10 opacity-70 blur-md transition-opacity duration-500 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    <X className="relative h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-subheading font-semibold text-iris-ink">
                      {limit.title}
                    </h3>
                    <p className="mt-1.5 text-body-sm text-iris-ink/70">
                      {limit.body}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-10 max-w-xl text-center text-body text-iris-ink/70"
        >
          That honesty is the design — verified computation, not certified
          facts.
        </motion.p>
      </SectionContent>
    </SectionShell>
  );
}
