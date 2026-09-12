"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { SectionShell, SectionContent } from "./section-kit";
import { LineReveal } from "@/components/brand/line-reveal";

/**
 * FOCUS — the measured Impilo statement section.
 * A 124px two-line claim reveals line-by-line ("line-inner") while
 * pinned, and beneath it sits the signature WHITE pill marquee: a
 * 296×54 cloud-white pill, overflow clipped, scrolling "SCROLLING …
 * KEEP SCROLLING" pairs in #5250d9 with a cyan ECG trace between them.
 */

const REVEAL_LINE = "Patients keep their records. Sites get verified answers.";
const REVEAL_WINDOW: [number, number] = [0.22, 0.68];
const WORD_SPAN = 0.14;

const MARQUEE_PAIRS = 8;

function ScrollWord({
  progress,
  range,
  reduce,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  reduce: boolean | null;
  children: string;
}) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [14, 0]);
  if (reduce) {
    return <span className="inline-block">{children}</span>;
  }
  return (
    <motion.span style={{ opacity, y }} className="inline-block">
      {children}
    </motion.span>
  );
}

/** One "SCROLLING ⌁ KEEP SCROLLING" pair — the ECG sits between the words. */
function MarqueePair({ hidden }: { hidden: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-3 px-2" aria-hidden={hidden || undefined}>
      <span className="whitespace-nowrap text-[13px] font-semibold tracking-[0.02em] text-iris-halo">
        SCROLLING
      </span>
      <svg viewBox="0 0 44 16" className="h-4 w-11 shrink-0" fill="none" aria-hidden="true">
        <path
          d="M0 8h12l3-5 4 10 3-5h8l2-3 3 6 2-3h7"
          stroke="var(--color-clinical-cyan)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ecg-dash"
        />
      </svg>
      <span className="whitespace-nowrap text-[13px] font-semibold tracking-[0.02em] text-iris-halo">
        KEEP SCROLLING
      </span>
    </span>
  );
}

export function ProblemSection() {
  const reduce = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ["start end", "end start"],
  });

  const words = REVEAL_LINE.split(" ");
  const stagger =
    (REVEAL_WINDOW[1] - REVEAL_WINDOW[0] - WORD_SPAN) /
    Math.max(words.length - 1, 1);
  const ranges = words.map((_, i): [number, number] => [
    REVEAL_WINDOW[0] + i * stagger,
    REVEAL_WINDOW[0] + i * stagger + WORD_SPAN,
  ]);

  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <SectionShell
      id="focus"
      aria-labelledby="focus-heading"
      className="overflow-hidden py-0 sm:py-0 lg:py-0"
    >
      <div ref={pinRef} className="relative lg:h-[145vh]">
        {/* Content rides high (justify-start + 14vh) so the statement
            enters view almost as soon as the track appears — no dead
            canvas between the hero dashboard and the pinned claim. */}
        <div className="sticky top-0 flex min-h-[84vh] flex-col items-center justify-start pt-[11vh] text-center sm:pt-[10vh] lg:min-h-screen">
          <SectionContent>
            <LineReveal
              as="h2"
              id="focus-heading"
              className="text-display-xl font-semibold text-cloud-white"
              delay={0.1}
            >
              <span>Allowing you to focus</span>
              <span>on the science.</span>
            </LineReveal>

            <p className="mx-auto mt-8 max-w-2xl text-heading-sm font-medium text-cloud-white/90 sm:mt-10">
              {words.map((word, i) => (
                <span key={`${word}-${i}`}>
                  {i > 0 ? " " : ""}
                  <ScrollWord
                    progress={scrollYProgress}
                    range={ranges[i]}
                    reduce={reduce}
                  >
                    {word}
                  </ScrollWord>
                </span>
              ))}
            </p>

            <motion.p
              {...reveal(0.1)}
              className="mx-auto mt-6 max-w-xl text-body text-pearl/80"
            >
              Eligibility checks usually demand the record before the answer
              exists. COHORT moves the check onto the patient&apos;s device and
              sends only the verified answer — so attention returns to care,
              not paperwork.
            </motion.p>

            {/* The Impilo signature — white pill marquee with ECG trace */}
            <motion.div
              {...reveal(0.18)}
              className="mt-12 flex justify-center"
            >
              <div
                className="marquee-mask grid h-[54px] w-[300px] overflow-hidden rounded-pill bg-cloud-white sm:w-[340px]"
                role="marquee"
                aria-label="Keep scrolling for more"
              >
                <div className="marquee-track items-center">
                  {Array.from({ length: MARQUEE_PAIRS }, (_, i) => (
                    <MarqueePair key={i} hidden={i > 0} />
                  ))}
                </div>
              </div>
            </motion.div>
          </SectionContent>
        </div>
      </div>
    </SectionShell>
  );
}
