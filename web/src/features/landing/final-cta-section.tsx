"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { LineReveal } from "@/components/brand/line-reveal";
import { ScrambleText } from "@/components/brand/scramble-text";
import { WordHighlight } from "@/components/brand/word-highlight";
import { Eyebrow, SectionContent } from "./section-kit";
import { useCohortStore } from "@/state/cohort-store";

/**
 * FINAL CTA — the destination. LIGHT canvas, ink headline set in two
 * line-revealed lines with the closing accent word ("search.") framed
 * in the marching-dash WordHighlight and resolved by the page's second
 * and last digit-scramble, armed on arrival so it flickers exactly when
 * the reader gets here. Staged like a place, not a strip: a big soft
 * indigo pool behind the headline, a cyan breath offset to the side,
 * film grain over the dot field, generous whitespace, the primary
 * double-pill CTA with its 3D core, and the live mint-dot caption. The
 * footer's curved indigo shapes begin rising from beneath this section.
 */
export function FinalCtaSection() {
  const reduce = useReducedMotion();
  const navigate = useCohortStore((s) => s.navigate);
  const stageRef = useRef<HTMLDivElement>(null);
  const armed = useInView(stageRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      id="final-cta"
      className="relative w-full overflow-hidden bg-pearl text-iris-ink"
      aria-labelledby="final-heading"
    >
      <div
        className="bg-dots-light pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />
      {/* Film grain over the dot field. */}
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      {/* Destination staging — a big soft indigo pool centered behind
          the headline, one cyan breath offset to the side. */}
      <div
        className="glow-blob glow-blob-veil top-[16%] left-1/2 h-[360px] w-[640px] -translate-x-1/2 opacity-60"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-cyan top-[34%] left-[20%] h-44 w-44 opacity-60"
        aria-hidden="true"
      />
      <SectionContent className="relative">
        <motion.div
          ref={stageRef}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl py-28 text-center sm:py-40"
        >
          <Eyebrow tone="ink">Begin</Eyebrow>
          <LineReveal
            as="h2"
            id="final-heading"
            className="mt-6 text-display-xl font-semibold text-iris-ink"
            delay={0.15}
          >
            <span>Learn how COHORT empowers</span>
            <span>
              your trial{" "}
              <WordHighlight tone="ink">
                {armed ? (
                  <ScrambleText text="search." delay={250} />
                ) : (
                  "search."
                )}
              </WordHighlight>
            </span>
          </LineReveal>
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mx-auto mt-6 max-w-lg text-body text-iris-ink/70"
          >
            Check eligibility privately, prove the typed match, then
            choose what happens next — without handing over your record.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <PillButton
              variant="primary"
              size="lg"
              iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate({ name: "trials" })}
            >
              Check eligibility
            </PillButton>
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("privacy")
                  ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
              }}
              className="inline-flex items-center gap-2 text-body font-semibold text-iris-ink/70 transition-colors outline-none hover:text-iris-ink focus-visible:ring-2 focus-visible:ring-clinical-cyan"
            >
              Read the privacy explainer
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mx-auto mt-12 flex items-center justify-center gap-2.5 text-caption font-semibold uppercase tracking-[0.16em] text-iris-ink/60"
          >
            <span
              className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-mint-vital"
              aria-hidden="true"
            />
            Private by design · Powered by Midnight
          </motion.p>
        </motion.div>
      </SectionContent>
    </section>
  );
}
