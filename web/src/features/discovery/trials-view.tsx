"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Microscope, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PillButton } from "@/components/brand/pill-button";
import { StatusPill, Tag } from "@/components/brand/status-pill";
import { EmptyStateArt } from "@/components/artwork/empty-state-art";
import { useCohortStore } from "@/state/cohort-store";
import type { MatchKind, Trial } from "@/domain/types";
import { isProfileReady, matchTrial } from "@/lib/private-match";
import { cn } from "@/lib/utils";

/** 255 is the circuit's Uint8 sentinel for "no maximum age posted". */
function ageLabel(trial: Trial): string {
  const { ageMin, ageMax } = trial.policy;
  return ageMax >= 255 ? `${ageMin}+ yrs` : `${ageMin}–${ageMax} yrs`;
}

function locationLabel(trial: Trial): string {
  const loc = trial.locations[0];
  if (loc?.remote) return "Remote · Telehealth";
  return loc ? `${loc.city}, ${loc.region}` : "Location on request";
}

/* ── Trial card ─────────────────────────────────────────────── */

function matchTone(kind: MatchKind): "mint" | "cyan" | "lilac" {
  if (kind === "verified") return "mint";
  if (kind === "potential") return "cyan";
  return "lilac";
}

function matchLabel(kind: MatchKind): string {
  if (kind === "verified") return "Verified eligibility";
  if (kind === "potential") return "Potential match";
  if (kind === "none") return "Not a typed match";
  return "Add private facts";
}

function TrialCard({ trial, index }: { trial: Trial; index: number }) {
  const navigate = useCohortStore((s) => s.navigate);
  const profile = useCohortStore((s) => s.profile);
  const checks = useCohortStore((s) => s.checks);
  const reduce = useReducedMotion();
  const verifiedIds = new Set(
    Object.values(checks)
      .filter((c) => c.proof.status === "verified")
      .map((c) => c.trialId),
  );
  const match = matchTrial(profile, trial, verifiedIds);
  const featured = match.kind === "potential" || match.kind === "verified";

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
      whileHover={reduce ? undefined : { y: -6 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border p-6 text-left transition-[border-color,box-shadow,transform] duration-300",
        featured
          ? "border-clinical-cyan/45 bg-cloud-white/[0.08] shadow-[0_18px_40px_-24px_rgba(92,255,177,0.45)] hover:border-mint-vital/50"
          : "border-iris-border bg-cloud-white/[0.06] hover:border-lilac-mist/60",
      )}
    >
      {/* Match rail — the card's state is readable before any text is. */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] transition-opacity duration-300",
          match.kind === "verified"
            ? "bg-mint-vital"
            : match.kind === "potential"
              ? "bg-clinical-cyan"
              : "bg-iris-border opacity-60",
        )}
        aria-hidden="true"
      />
      {/* Hover wash — light gathers at the top edge on approach. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cloud-white/[0.07] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <StatusPill status={trial.status} />
        {trial.phase && trial.phase.toUpperCase() !== "NA" ? (
          <Tag tone="violet">{trial.phase}</Tag>
        ) : null}
      </div>

      {/* The title carries the card; the condition is context under it,
       * clamped so a long sponsor-mapped label cannot outweigh it. */}
      <h3 className="relative mt-4 line-clamp-3 text-heading-sm font-semibold text-balance text-cloud-white">
        {trial.title}
      </h3>
      <p className="relative mt-2.5 line-clamp-1 text-body-sm text-lilac-mist">
        {trial.condition}
      </p>
      <p className="relative mt-1 font-mono text-caption tracking-wide text-lilac-mist/70">
        {trial.id}
      </p>

      <dl className="relative mt-4 grid grid-cols-2 gap-3 text-body-sm text-pearl/85">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-lilac-mist" aria-hidden="true" />
          <dt className="sr-only">Age range</dt>
          <dd>{ageLabel(trial)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-lilac-mist" aria-hidden="true" />
          <dt className="sr-only">Location</dt>
          <dd className="truncate">{locationLabel(trial)}</dd>
        </div>
      </dl>

      <div
        className={cn(
          "relative mt-5 rounded-field border p-3 transition-colors duration-300",
          featured
            ? "border-clinical-cyan/30 bg-deep-iris/50"
            : "border-iris-border/60 bg-deep-iris/40",
        )}
      >
        <Tag tone={matchTone(match.kind)}>{matchLabel(match.kind)}</Tag>
        <p className="mt-2 text-caption text-pearl/75">
          {match.kind === "verified"
            ? "Midnight verified the typed match. This is not full protocol eligibility."
            : match.kind === "potential"
              ? "Local preview only. Not a cryptographic proof."
              : match.reasons[0]}
        </p>
        {match.kind === "potential" || match.kind === "verified" ? (
          <ul className="mt-2 flex flex-col gap-1 text-caption text-lilac-mist">
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="relative mt-4 flex items-center gap-2 text-caption text-lilac-mist">
        <Microscope className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{trial.sponsor}</span>
      </p>

      <button
        type="button"
        className="absolute inset-0 rounded-card"
        aria-label={`Open ${trial.title} (${trial.id})`}
        onClick={() => navigate({ name: "trial", trialId: trial.id })}
      />

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-caption text-lilac-mist">
          Typed criteria only
        </span>
        <PillButton
          size="sm"
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
  const profile = useCohortStore((s) => s.profile);
  const checks = useCohortStore((s) => s.checks);
  const navigate = useCohortStore((s) => s.navigate);
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [potentialOnly, setPotentialOnly] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    void ensureTrials();
  }, [ensureTrials]);

  const verifiedIds = useMemo(
    () =>
      new Set(
        Object.values(checks)
          .filter((c) => c.proof.status === "verified")
          .map((c) => c.trialId),
      ),
    [checks],
  );

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
    if (potentialOnly) {
      list = list.filter((t) => {
        const kind = matchTrial(profile, t, verifiedIds).kind;
        return kind === "potential" || kind === "verified";
      });
    }
    return list;
  }, [trials, query, category, recruitingOnly, potentialOnly, profile, verifiedIds]);

  const matchSummary = useMemo(() => {
    if (!isProfileReady(profile) || trials.length === 0) return null;
    let potential = 0;
    let verified = 0;
    for (const trial of trials) {
      const kind = matchTrial(profile, trial, verifiedIds).kind;
      if (kind === "potential") potential += 1;
      if (kind === "verified") verified += 1;
    }
    return { potential, verified, total: trials.length };
  }, [profile, trials, verifiedIds]);

  const categories = useMemo(() => {
    const set = new Set(trials.map((t) => t.category));
    return ["All", ...Array.from(set).sort()];
  }, [trials]);

  const loading = status === "loading" || status === "idle";

  const clearFilters = () => {
    setDiscovery({ query: "", category: "All" });
    setRecruitingOnly(false);
    setPotentialOnly(false);
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
          className="mt-4 text-heading font-semibold text-balance text-cloud-white sm:text-heading-lg"
        >
          Find trials for me.
        </h1>
        <p className="mt-3 max-w-2xl text-body text-pearl/80">
          Public recruiting studies. Potential match is a local preview.
          Verified eligibility is a Midnight proof.
        </p>
        {!isProfileReady(profile) ? (
          <PillButton
            className="mt-5"
            variant="ghost"
            onClick={() => navigate({ name: "profile" })}
          >
            Add private facts
          </PillButton>
        ) : matchSummary ? (
          <p className="mt-5 text-body-sm text-pearl/75">
            {matchSummary.potential} potential match
            {matchSummary.potential === 1 ? "" : "es"}
            {matchSummary.verified
              ? ` and ${matchSummary.verified} verified`
              : ""}{" "}
            of {matchSummary.total} public studies. Local preview, not a proof.
          </p>
        ) : null}
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
          <button
            type="button"
            aria-pressed={potentialOnly}
            onClick={() => setPotentialOnly((v) => !v)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 py-2 text-body-sm font-medium transition-colors",
              potentialOnly
                ? "bg-iris-pulse text-cloud-white"
                : "border border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
            )}
          >
            Potential matches
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
            Trial data is temporarily unavailable.
          </h2>
          <p className="mt-2 text-body-sm text-pearl/70">
            The public study listing could not be reached. COHORT will not
            substitute fake trials.
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
                Try a different condition or search term, or clear your
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
