"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  Clock,
  MapPin,
  Microscope,
  Pill,
  Smartphone,
  Stethoscope,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PillButton } from "@/components/brand/pill-button";
import { IconNode } from "@/components/brand/icon-node";
import { StatusPill, Tag } from "@/components/brand/status-pill";
import { PrivacyIndicator } from "@/components/privacy/privacy-indicator";
import { BackLink } from "@/components/layout/back-link";
import { useCohortStore } from "@/state/cohort-store";
import type { PublicCriterion, Trial } from "@/domain/types";

const CRITERIA_ICONS: Record<PublicCriterion["kind"], LucideIcon> = {
  age: Calendar,
  condition: Stethoscope,
  medication: Pill,
  clinical: Activity,
  commitment: Clock,
};

function locationLabel(trial: Trial): string {
  const loc = trial.locations[0];
  if (loc?.remote) return "Remote · Telehealth";
  return loc ? `${loc.city}, ${loc.region}` : "Location on request";
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading study">
      <Skeleton className="h-11 w-40 rounded-pill bg-cloud-white/[0.06]" />
      <Skeleton className="h-10 w-3/4 bg-cloud-white/[0.06]" />
      <Skeleton className="h-8 w-1/2 rounded-pill bg-cloud-white/[0.06]" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-card bg-cloud-white/[0.06]" />
          <Skeleton className="h-80 rounded-card bg-cloud-white/[0.06]" />
        </div>
        <Skeleton className="h-96 rounded-card bg-cloud-white/[0.06]" />
      </div>
    </div>
  );
}

export function TrialDetailView({ trialId }: { trialId: string }) {
  const trial = useCohortStore((s) => s.trials.find((t) => t.id === trialId));
  const status = useCohortStore((s) => s.trialsStatus);
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  if (status === "loading" || status === "idle") {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <DetailSkeleton />
      </section>
    );
  }

  if (!trial) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <BackLink label="All trials" />
        <motion.div
          {...fadeUp()}
          className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center"
        >
          <h1 className="text-subheading font-semibold text-cloud-white">
            This study isn&apos;t available.
          </h1>
          <p className="mt-2 text-body-sm text-pearl/70">
            The listing may have closed, or the study identifier wasn&apos;t
            recognized.
          </p>
        </motion.div>
      </section>
    );
  }

  const metaChips: { icon: LucideIcon; label: string }[] = [
    { icon: MapPin, label: locationLabel(trial) },
    { icon: Clock, label: trial.durationLabel },
    { icon: Users, label: trial.enrollmentTarget > 0 ? `${trial.enrollmentTarget} target enrollment` : "Enrollment on study record" },
    { icon: Building2, label: trial.sponsor },
  ];

  return (
    <section
      className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16"
      aria-labelledby="trial-detail-heading"
    >
      <BackLink label="All trials" />

      <motion.header {...fadeUp()} className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="violet">{trial.category}</Tag>
          <Tag tone="lilac">{trial.phase}</Tag>
        </div>
        <h1
          id="trial-detail-heading"
          className="mt-4 text-[26px] font-semibold text-cloud-white sm:text-heading-sm"
        >
          {trial.title}
        </h1>
        <div className="mt-4">
          <StatusPill status={trial.status} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {metaChips.map(({ icon: Icon, label }) => (
            <Tag key={label} tone="violet">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Tag>
          ))}
        </div>
      </motion.header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column — the public study facts */}
        <div className="space-y-6">
          <motion.section
            {...fadeUp(0.08)}
            className="rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
            aria-labelledby="about-heading"
          >
            <h2
              id="about-heading"
              className="text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist"
            >
              About this study
            </h2>
            <p className="mt-4 text-body leading-relaxed text-pearl/80">
              {trial.summary}
            </p>
            <p className="mt-5 flex items-center gap-2 text-caption text-lilac-mist">
              <Microscope className="h-4 w-4 shrink-0" aria-hidden="true" />
              {trial.sponsor} · {trial.id}
            </p>
          </motion.section>

          <motion.section
            {...fadeUp(0.14)}
            className="rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
            aria-labelledby="criteria-heading"
          >
            <h2
              id="criteria-heading"
              className="text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist"
            >
              Key eligibility criteria
            </h2>
            <ul className="mt-5 space-y-4">
              {trial.criteriaHighlights.map((criterion) => {
                const Icon = CRITERIA_ICONS[criterion.kind];
                return (
                  <li key={criterion.id} className="flex items-center gap-4">
                    <IconNode tone="lilac">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </IconNode>
                    <span className="flex-1 text-body text-cloud-white">
                      {criterion.label}
                    </span>
                    <Check
                      className="h-4 w-4 shrink-0 text-mint-vital"
                      aria-hidden="true"
                    />
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 border-t border-iris-border/50 pt-5 text-caption text-lilac-mist">
              Full protocol available on the public study listing.
            </p>
          </motion.section>
        </div>

        {/* Right column — the private check entry point */}
        <motion.aside {...fadeUp(0.18)} className="relative lg:sticky lg:top-24">
          <div
            className="pointer-events-none absolute -inset-8 rounded-card-elevated opacity-70"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--color-clinical-cyan) 13%, transparent) 0%, transparent 65%)",
            }}
            aria-hidden="true"
          />
          <div className="relative space-y-5 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6">
            <PrivacyIndicator variant="banner" />
            <p className="text-caption text-lilac-mist">
              ≈{trial.checkMinutes} min · answers stay on your device
            </p>
            <PillButton
              className="w-full"
              onClick={() => navigate({ name: "check", trialId: trial.id })}
            >
              Check eligibility privately
            </PillButton>
            <a
              href={trial.studyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-pearl/40 bg-transparent px-6 py-3 text-body font-medium text-cloud-white transition-colors hover:border-pearl/70 hover:bg-cloud-white/5"
            >
              View full study
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <div className="h-px bg-iris-border/60" aria-hidden="true" />
            <div>
              <p className="flex items-center gap-2 text-body-sm font-medium text-cloud-white">
                <Smartphone
                  className="h-4 w-4 text-mint-vital"
                  aria-hidden="true"
                />
                What stays private
              </p>
              <ul className="mt-3 space-y-2">
                {["Age", "Diagnosis", "Medications"].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-body-sm text-pearl/75"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-mint-vital"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
