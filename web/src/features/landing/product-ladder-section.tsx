"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell, SectionContent } from "./section-kit";

const NOW = [
  {
    title: "Private typed match",
    body: "Public ClinicalTrials.gov rules. Your age and mapped flags stay on this device.",
  },
  {
    title: "Self-attested proof",
    body: "1AM proves the typed predicate in-browser. The chain sees a nullifier, a referral commitment, and a counter — not your record.",
  },
  {
    title: "Public qualification",
    body: "Anyone you share the verification record with can confirm eligibility was proven. They cannot recover your facts.",
  },
  {
    title: "You choose the next step",
    body: "Keep private, share a public qualification, continue to ClinicalTrials.gov, or copy a public-safe packet. No inbox, no bounty, no EHR.",
  },
];

const NEXT = [
  {
    title: "Issuer-signed health facts",
    body: "A provider can attest a structured claim. Not live. No fake verified-patient badge.",
  },
  {
    title: "EHR / SMART on FHIR",
    body: "Import stays Coming soon until an authentic issuer exists.",
  },
  {
    title: "Escrowed referral marketplace",
    body: "Sites paying for qualified referrals needs a new circuit. The current contract does not hold bounty.",
  },
];

export function ProductLadderSection() {
  const reduce = useReducedMotion();

  return (
    <SectionShell
      tone="light"
      id="now-next"
      aria-labelledby="now-next-heading"
      className="overflow-hidden"
    >
      <div className="bg-noise pointer-events-none absolute inset-0" aria-hidden="true" />
      <SectionContent className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <Eyebrow tone="ink">Available now · Coming next</Eyebrow>
          <h2
            id="now-next-heading"
            className="mt-4 text-heading font-semibold text-iris-ink"
          >
            What is live, and what is not.
          </h2>
          <p className="mt-5 text-body text-iris-ink/70">
            The product is private matching, a verified eligibility
            signal, and a user-controlled next step. It is not a
            medical-records warehouse and not a paid referral market — yet.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.16em] text-iris-ink">
              Available now
            </p>
            <ul className="mt-4 divide-y divide-iris-ink/[0.16]">
              {NOW.map((row, i) => (
                <motion.li
                  key={row.title}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="py-5"
                >
                  <h3 className="text-subheading font-semibold text-iris-ink">
                    {row.title}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-iris-ink/70">{row.body}</p>
                </motion.li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.16em] text-iris-ink/55">
              Coming next
            </p>
            <ul className="mt-4 divide-y divide-iris-ink/[0.16]">
              {NEXT.map((row, i) => (
                <motion.li
                  key={row.title}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.12 + i * 0.06 }}
                  className="py-5"
                >
                  <h3 className="text-subheading font-semibold text-iris-ink/80">
                    {row.title}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-iris-ink/60">{row.body}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </SectionContent>
    </SectionShell>
  );
}
