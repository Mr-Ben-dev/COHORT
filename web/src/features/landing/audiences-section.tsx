"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Hash, Layers, List, RefreshCw } from "lucide-react";
import { SectionShell, SectionContent } from "./section-kit";

/**
 * TRUSTED BY — the navy interlude (impilo's "Trusted by digital health
 * leaders" moment, translated to COHORT). A deep-navy band carries the
 * public-data provenance story: a veiled, film-grained canvas with one
 * blurred indigo light pooling behind the heading, and four true glass
 * cards (backdrop-blur, 1px white borders, inset top highlights) —
 * teal icons glowing softly in lit nodes, white 600 labels, lilac/60
 * sublines. Cards lift 3px and brighten their border on hover.
 */

const FEEDS = [
  {
    icon: List,
    label: "ClinicalTrials.gov API",
    sub: "The official registry endpoint",
  },
  {
    icon: Hash,
    label: "NCT registry IDs",
    sub: "Every trial, cited by ID",
  },
  {
    icon: Layers,
    label: "Phase & status fields",
    sub: "Structured eligibility data",
  },
  {
    icon: RefreshCw,
    label: "Public registry source",
    sub: "Fetched through COHORT's public API",
  },
];

export function TrustedBySection() {
  const reduce = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <SectionShell
      tone="dark"
      className="overflow-hidden bg-navy-canvas"
      aria-labelledby="trusted-by-heading"
    >
      {/* Navy veil + dot grid + film grain, the impilo steps-band treatment */}
      <div
        className="bg-navy-veil pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="bg-dots pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      />
      <div
        className="bg-noise pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <SectionContent className="relative">
        <motion.div
          {...reveal(0)}
          className="relative mx-auto max-w-2xl text-center"
        >
          {/* blurred indigo light pooling behind the copy */}
          <div
            className="glow-blob glow-blob-veil absolute left-1/2 top-1/2 h-60 w-[36rem] -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <h2
            id="trusted-by-heading"
            className="relative text-heading font-semibold text-cloud-white"
          >
            Built on public trial data.
          </h2>
          <p className="relative mt-5 text-body text-cloud-white/75">
            COHORT&apos;s trial catalog is not a proprietary database — it is
            the public registry, structured and refreshed. Every trial you
            see cites its NCT identifier, phase, and recruitment status
            exactly as posted.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEEDS.map((feed, i) => (
            <motion.article
              key={feed.label}
              {...reveal(0.08 + i * 0.07)}
              className="h-full"
            >
              {/* true navy glass — translucent, blurred, inset-lit from
                  above. The inner top-glow bar (a blurred pool of light
                  under the upper edge) is what makes the pane read as
                  angled glass catching the section's staged light. */}
              <div className="glass-panel-soft relative flex h-full flex-col overflow-hidden rounded-card p-6 transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-[3px] motion-safe:hover:border-white/25 motion-safe:hover:shadow-[0_20px_44px_-18px_rgba(10,10,50,0.7)]">
                <span
                  className="pointer-events-none absolute inset-x-5 top-0 h-10 rounded-b-[999px] bg-white/[0.12] blur-xl"
                  aria-hidden="true"
                />
                <span className="glow-cyan relative inline-flex h-11 w-11 items-center justify-center rounded-field border border-white/10 bg-cloud-white/[0.05]">
                  <feed.icon
                    className="h-5 w-5 text-teal-signal"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="relative mt-4 text-body font-semibold text-cloud-white">
                  {feed.label}
                </h3>
                <p className="relative mt-1.5 text-body-sm text-lilac-mist/60">
                  {feed.sub}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </SectionContent>
    </SectionShell>
  );
}
