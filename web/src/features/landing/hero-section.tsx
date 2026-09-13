"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { WordHighlight } from "@/components/brand/word-highlight";
import { RotatingWord } from "@/components/brand/rotating-word";
import { HeroPrivacyFlow } from "@/components/artwork/hero-privacy-flow";
import { InterfaceDashboard } from "@/components/artwork/interface-dashboard";
import { useCohortStore } from "@/state/cohort-store";
import { SectionContent } from "./section-kit";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * HERO — measured Impilo structure:
 * line-art device cluster LEFT (thin lilac strokes), copy RIGHT with the
 * rotating cyan word set LARGER than the headline itself (124px vs 92px),
 * sub-copy, one primary double-pill CTA + text link — and the section's
 * bottom centerpiece: the giant painted interface dashboard illustration.
 */
export function HeroSection() {
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.75, ease: EASE },
  });

  return (
    <section
      className="relative w-full overflow-hidden bg-deep-iris"
      aria-labelledby="hero-heading"
    >
      {/* Impilo hero veil + faint dot field + film grain */}
      <div
        className="bg-hero-veil pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="bg-dots pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      {/* Depth blobs — ambient occlusion zones behind the artwork
       * cluster and the dashboard centerpiece (the "3D without bg"
       * atmosphere: no boxes, just light). */}
      <div
        className="glow-blob glow-blob-lilac left-[-4%] top-[16%] h-72 w-72"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-cyan left-[2%] top-[38%] h-64 w-64 opacity-80"
        aria-hidden="true"
      />
      <div
        className="glow-blob glow-blob-veil left-1/2 top-[46%] hidden h-[420px] w-[560px] -translate-x-1/2 lg:block"
        aria-hidden="true"
      />

      <SectionContent className="relative">
        <div className="grid items-center gap-12 py-14 sm:py-18 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-20">
          {/* Artwork — thin lilac line-art device cluster, floating
           * on its own blurred atmosphere (no box, just light) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="relative order-2 mx-auto w-full max-w-[440px] lg:order-1"
          >
            <div
              className="glow-blob glow-blob-lilac left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <HeroPrivacyFlow className="relative" />
          </motion.div>

          {/* Copy column */}
          <div className="order-1 max-w-xl lg:order-2">
            {/* The problem, stated before the headline gets to be clever. */}
            <motion.p
              {...fadeUp(0)}
              className="mb-6 inline-flex items-center gap-2.5 rounded-pill border border-iris-border/70 bg-cloud-white/[0.06] px-4 py-2 text-caption font-semibold uppercase tracking-[0.14em] text-lilac-mist"
            >
              <span
                className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-clinical-cyan"
                aria-hidden="true"
              />
              Trials ask for your record before they say yes
            </motion.p>
            <h1
              id="hero-heading"
              className="text-display font-semibold text-cloud-white"
            >
              <motion.span {...fadeUp(0)} className="block">
                Making trial eligibility
              </motion.span>
              <motion.span
                {...fadeUp(0.14)}
                className="mt-1 block sm:mt-2"
                aria-label="private, provable, yours"
              >
                <WordHighlight className="align-baseline">
                  <RotatingWord
                    words={["private.", "provable.", "yours."]}
                    interval={2800}
                    className="text-display-word font-semibold"
                    label="private, provable, yours"
                  />
                </WordHighlight>
              </motion.span>
            </h1>

            <motion.p
              {...fadeUp(0.26)}
              className="mt-7 max-w-lg text-subheading text-pearl/85"
            >
              Find trials you may qualify for. Check your fit privately.
              Prove it on Midnight. Choose what happens next — without
              handing over your health record.
            </motion.p>

            <motion.div
              {...fadeUp(0.36)}
              className="mt-9 flex flex-wrap items-center gap-5"
            >
              <PillButton
                size="lg"
                iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate({ name: "trials" })}
              >
                Find a trial
              </PillButton>
              <motion.a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({
                      behavior: reduce ? "auto" : "smooth",
                    });
                }}
                whileHover={reduce ? undefined : { x: 4 }}
                className="group inline-flex items-center gap-2 text-body font-semibold text-lilac-mist transition-colors outline-none hover:text-cloud-white focus-visible:ring-2 focus-visible:ring-clinical-cyan"
              >
                Let&apos;s show you how we do it
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </motion.a>
            </motion.div>

            {/* Live evidence, not a badge wall — every value below is
             * checkable on the public Midnight indexer. */}
            <motion.dl
              {...fadeUp(0.46)}
              className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-iris-border/50 pt-6"
            >
              {[
                { t: "Midnight Preprod", d: "Live network" },
                { t: "In-browser", d: "Proving stays local" },
                { t: "Public indexer", d: "Verification source" },
              ].map((stat) => (
                <div key={stat.t}>
                  <dt className="text-body-sm font-semibold text-cloud-white">
                    {stat.t}
                  </dt>
                  <dd className="mt-1 text-caption text-lilac-mist">
                    {stat.d}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>
      </SectionContent>

      {/* The hero centerpiece — painted interface dashboard illustration */}
      <SectionContent className="relative pb-8 sm:pb-10 lg:pb-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55, ease: EASE }}
          className="mx-auto max-w-[1080px]"
        >
          <InterfaceDashboard />
        </motion.div>
      </SectionContent>
    </section>
  );
}
