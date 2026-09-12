"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, MapPin, Microscope, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PillButton } from "@/components/brand/pill-button";
import { StatusPill, Tag } from "@/components/brand/status-pill";
import { EmptyStateArt } from "@/components/artwork/empty-state-art";
import { useCohortStore } from "@/state/cohort-store";
import type { Trial } from "@/domain/types";
import { cn } from "@/lib/utils";

function locationLabel(trial: Trial): string {
  const loc = trial.locations[0];
  if (loc?.remote) return "Remote · Telehealth";
  return loc ? `${loc.city}, ${loc.region}` : "Location on request";
}

/* ── Trial card ─────────────────────────────────────────────── */

function TrialCard({ trial, index }: { trial: Trial; index: number }) {
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group relative flex flex-col rounded-card border border-iris-border bg-cloud-white/[0.06] p-5 text-left transition-colors duration-300 hover:border-lilac-mist/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="violet">{trial.category}</Tag>
        <Tag tone="lilac">{trial.phase}</Tag>
      </div>

      <h3 className="mt-4 line-clamp-2 text-subheading font-semibold text-cloud-white">
        {trial.title}
      </h3>

      <div className="mt-3">
        <StatusPill status={trial.status} />
      </div>

      <ul className="mt-4 space-y-2">
        <li className="flex items-center gap-2.5 text-body-sm text-pearl/80">
          <MapPin className="h-4 w-4 shrink-0 text-lilac-mist" aria-hidden="true" />
          {locationLabel(trial)}
        </li>
        <li className="flex items-center gap-2.5 text-body-sm text-pearl/80">
          <Users className="h-4 w-4 shrink-0 text-lilac-mist" aria-hidden="true" />
          Ages {trial.policy.ageMin}–{trial.policy.ageMax}
        </li>
        <li className="flex items-center gap-2.5 text-body-sm text-pearl/80">
          <Clock className="h-4 w-4 shrink-0 text-lilac-mist" aria-hidden="true" />
          ≈{trial.checkMinutes} min to check
        </li>
      </ul>

      <p className="mt-4 flex items-center gap-2 text-caption text-lilac-mist">
        <Microscope className="h-4 w-4 shrink-0" aria-hidden="true" />
        {trial.sponsor}
      </p>

      {/* Stretched card button — opens the trial. The inner CTA sits above it. */}
      <button
        type="button"
        className="absolute inset-0 rounded-card"
        aria-label={`Open ${trial.title} (${trial.id})`}
        onClick={() => navigate({ name: "trial", trialId: trial.id })}
      />

      <div className="mt-5 flex items-center justify-between gap-3 pt-1">
        <Tag tone="cyan">
          {trial.bounty > 0 ? `$${trial.bounty} referral bounty` : "On-chain referral"}
        </Tag>
        <PillButton
          size="sm"
          className="relative z-10"
          onClick={(event) => {
            event.stopPropagation();
            navigate({ name: "check", trialId: trial.id });
          }}
        >
          Check privately
        </PillButton>
      </div>
    </motion.article>
  );
}

/* ── Discovery view ─────────────────────────────────────────── */

export function TrialsView() {
  const query = useCohortStore((s) => s.discovery.query);
  const category = useCohortStore((s) => s.discovery.category);
  const setDiscovery = useCohortStore((s) => s.setDiscovery);
  const trials = useCohortStore((s) => s.trials);
  const status = useCohortStore((s) => s.trialsStatus);
  const ensureTrials = useCohortStore((s) => s.ensureTrials);
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    void ensureTrials();
  }, [ensureTrials]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = trials;
    if (recruitingOnly) list = list.filter((t) => t.status === "recruiting");
    if (category !== "All") list = list.filter((t) => t.category === category);
    if (q) {
      list = list.filter((t) =>
        [t.title, t.condition, t.category, t.sponsor, t.id].some((field) =>
          field.toLowerCase().includes(q),
        ),
      );
    }
    return list;
  }, [trials, query, category, recruitingOnly]);

  const categories = useMemo(() => {
    const set = new Set(trials.map((t) => t.category));
    return ["All", ...Array.from(set).sort()];
  }, [trials]);

  const loading = status === "loading" || status === "idle";

  const clearFilters = () => {
    setDiscovery({ query: "", category: "All" });
    setRecruitingOnly(false);
  };

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16"
      aria-labelledby="trials-heading"
    >
      <motion.header {...fadeUp()}>
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
          Find trials
        </p>
        <h1
          id="trials-heading"
          className="mt-3 text-[28px] font-semibold text-cloud-white sm:text-heading-sm"
        >
          Find a clinical trial.
        </h1>
        <p className="mt-3 max-w-2xl text-body text-pearl/80">
          Recruiting studies with public eligibility rules. Checks run
          privately on your device.
        </p>
      </motion.header>

      {/* Controls */}
      <motion.div {...fadeUp(0.08)} className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lilac-mist"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setDiscovery({ query: e.target.value })}
            placeholder="Search condition, sponsor, or NCT number…"
            aria-label="Search trials by condition, sponsor, or NCT number"
            className="h-12 rounded-field border-iris-border bg-deep-iris/60 pl-11 text-body text-cloud-white placeholder:text-lilac-mist/60"
          />
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter studies by category"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setDiscovery({ category: cat })}
              className={cn(
                "min-h-11 rounded-pill px-4 py-2 text-body-sm font-medium transition-colors",
                category === cat
                  ? "bg-iris-pulse text-cloud-white"
                  : "border border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
              )}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={recruitingOnly}
            onClick={() => setRecruitingOnly((v) => !v)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 py-2 text-body-sm font-medium transition-colors",
              recruitingOnly
                ? "bg-iris-pulse text-cloud-white"
                : "border border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                recruitingOnly ? "bg-mint-vital" : "bg-lilac-mist/40",
              )}
              aria-hidden="true"
            />
            Recruiting only
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-64 rounded-card border border-iris-border/40 bg-cloud-white/[0.06]"
            />
          ))}
        </div>
      ) : status === "error" ? (
        <motion.div
          {...fadeUp(0.1)}
          className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center"
        >
          <h2 className="text-subheading font-semibold text-cloud-white">
            Trial data didn&apos;t load.
          </h2>
          <p className="mt-2 text-body-sm text-pearl/70">
            The public study listing couldn&apos;t be reached. Check your
            connection and try again.
          </p>
          <PillButton className="mt-6" onClick={() => void ensureTrials()}>
            Try again
          </PillButton>
        </motion.div>
      ) : (
        <>
          <p
            className="mt-8 text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist"
            aria-live="polite"
          >
            {filtered.length} {filtered.length === 1 ? "study" : "studies"} match
          </p>

          {filtered.length === 0 ? (
            <motion.div
              {...fadeUp(0.1)}
              className="mt-8 flex flex-col items-center rounded-card border border-iris-border/60 bg-cloud-white/[0.04] p-10 text-center"
            >
              <EmptyStateArt />
              <h2 className="mt-6 text-subheading font-semibold text-cloud-white">
                No studies match your filters.
              </h2>
              <p className="mt-2 max-w-sm text-body-sm text-pearl/70">
                Try a different condition or search term — or clear your
                filters to see every listed study.
              </p>
              <PillButton variant="ghost" className="mt-6" onClick={clearFilters}>
                Clear filters
              </PillButton>
            </motion.div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((trial, i) => (
                <TrialCard key={trial.id} trial={trial} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
