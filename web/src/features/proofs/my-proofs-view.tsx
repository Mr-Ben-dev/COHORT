"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { Tag } from "@/components/brand/status-pill";
import { EmptyStateArt } from "@/components/artwork/empty-state-art";
import { useCohortStore } from "@/state/cohort-store";
import type { EligibilityCheck } from "@/domain/types";

function formatStamp(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

function ProofCard({ check, index }: { check: EligibilityCheck; index: number }) {
  const trial = useCohortStore((s) => s.trials.find((t) => t.id === check.trialId));
  const navigate = useCohortStore((s) => s.navigate);
  const requestReferral = useCohortStore((s) => s.requestReferral);
  const reduce = useReducedMotion();

  const eligible = check.result.eligible;

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
      className="flex flex-col rounded-card border border-iris-border bg-cloud-white/[0.06] p-5 transition-colors duration-300 hover:border-lilac-mist/60"
    >
      <p className="text-caption text-lilac-mist">
        {trial ? `${trial.condition} · ${trial.id}` : check.trialId}
      </p>
      <h3 className="mt-2 line-clamp-2 text-subheading font-semibold text-cloud-white">
        {trial ? trial.title : check.trialId}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {check.proof.status === "verified" ? (
          <Tag tone="mint">Verified eligibility</Tag>
        ) : (
          <Tag tone="lilac">Potential match only</Tag>
        )}
        {eligible ? (
          check.referral ? (
            <Tag tone="cyan">Public qualification posted</Tag>
          ) : check.proof.status === "verified" ? (
            <Tag tone="mint">Referral commitment created</Tag>
          ) : (
            <Tag tone="lilac">Not shared</Tag>
          )
        ) : (
          <Tag tone="lilac">Not eligible</Tag>
        )}
      </div>

      <p className="mt-4 break-all text-caption text-clinical-cyan">
        {check.proof.publicRef}
      </p>
      <p className="mt-1 text-caption text-lilac-mist">
        {formatStamp(check.proof.verifiedAt)}
      </p>

      <div className="mt-auto flex flex-wrap gap-2.5 pt-5">
        <PillButton
          size="sm"
          variant="quiet"
          onClick={() => navigate({ name: "verification", checkId: check.id })}
        >
          View public record
        </PillButton>
        {eligible && !check.referral && (
          <PillButton
            size="sm"
            onClick={() => void requestReferral(check.id)}
          >
            Share qualification
          </PillButton>
        )}
      </div>
    </motion.article>
  );
}

export function MyProofsView() {
  const checks = useCohortStore((s) => s.checks);
  const activeProving = useCohortStore((s) => s.activeProving);
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const list = useMemo(
    () =>
      Object.values(checks)
        .filter((c) => c.proof.status === "verified" && (c.proof.txHash || c.proof.txId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [checks],
  );

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16"
      aria-labelledby="proofs-heading"
    >
      <motion.header {...fadeUp()}>
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
          My proofs
        </p>
        <h1
          id="proofs-heading"
          className="mt-3 text-[28px] font-semibold text-cloud-white sm:text-heading-sm"
        >
          Your proofs.
        </h1>
        <p className="mt-3 max-w-2xl text-body text-pearl/80">
          Where you have already proven eligibility. Public-safe data only.
        </p>
      </motion.header>

      {list.length === 0 ? (
        <motion.div
          {...fadeUp(0.1)}
          className="mt-10 flex flex-col items-center rounded-card border border-iris-border/60 bg-cloud-white/[0.04] p-10 text-center"
        >
          <EmptyStateArt />
          <h2 className="mt-6 text-subheading font-semibold text-cloud-white">
            No proofs yet.
          </h2>
          <p className="mt-2 max-w-sm text-body-sm text-pearl/70">
            Verified eligibility proofs stay on this device as public-safe
            metadata. Local potential matches are not proofs.
          </p>
          <PillButton
            className="mt-6"
            iconEnd={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => navigate({ name: "trials" })}
          >
            Find a trial
          </PillButton>
        </motion.div>
      ) : (
        <>
          {activeProving && (
            <motion.div
              {...fadeUp(0.08)}
              className="flex flex-wrap items-center gap-4 rounded-card border border-iris-border bg-cloud-white/[0.06] p-4"
            >
              <span
                className="relative flex h-2.5 w-2.5 shrink-0"
                aria-hidden="true"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-clinical-cyan" />
              </span>
              <p className="min-w-0 flex-1 text-body-sm text-pearl/80">
                Check in progress for {activeProving.trialId}
              </p>
              <PillButton
                size="sm"
                variant="quiet"
                onClick={() =>
                  navigate({
                    name: "proving",
                    trialId: activeProving.trialId,
                  })
                }
              >
                Resume
              </PillButton>
            </motion.div>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((check, i) => (
              <ProofCard key={check.id} check={check} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
