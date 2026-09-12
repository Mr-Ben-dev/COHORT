"use client";

import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import {
  BadgeCheck,
  Check,
  Clock,
  EyeOff,
  Fingerprint,
  FlaskConical,
  Minus,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { PrivacyIndicator } from "@/components/privacy/privacy-indicator";
import { BackLink } from "@/components/layout/back-link";
import { useCohortStore } from "@/state/cohort-store";

function formatStamp(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

function RecordRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="flex items-center gap-2.5 text-body-sm text-lilac-mist">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-body-sm font-medium text-cloud-white">
        {children}
      </dd>
    </div>
  );
}

export function ResultView({ checkId }: { checkId: string }) {
  const check = useCohortStore((s) => s.checks[checkId]);
  const trial = useCohortStore((s) =>
    s.trials.find((t) => t.id === check?.trialId),
  );
  const navigate = useCohortStore((s) => s.navigate);
  const requestReferral = useCohortStore((s) => s.requestReferral);
  const reduce = useReducedMotion();

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  if (!check || !trial) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <BackLink label="Back" />
        <div className="mx-auto mt-6 max-w-xl rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center">
          <h1 className="text-subheading font-semibold text-cloud-white">
            This result isn&apos;t available.
          </h1>
          <p className="mt-2 text-body-sm text-pearl/70">
            The check it belongs to couldn&apos;t be found on this device.
          </p>
        </div>
      </section>
    );
  }

  const eligible = check.result.eligible;
  const unsatisfied = check.result.outcomes.filter((o) => !o.satisfied);

  /* ── Not eligible — respectful, private, neutral violet ────── */
  if (!eligible) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <BackLink label="Back" />

          <motion.header {...fadeUp()} className="mt-6 text-center">
            <motion.div
              initial={reduce ? false : { scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-lilac-mist/40 bg-lilac-mist/10"
              aria-hidden="true"
            >
              <Minus className="h-9 w-9 text-lilac-mist" />
            </motion.div>
            <h1 className="mt-6 text-heading-sm font-semibold text-cloud-white sm:text-heading">
              Not eligible for this trial
            </h1>
            <p className="mt-3 text-body text-pearl/85">
              At least one eligibility requirement was not satisfied.
            </p>
            <p className="mt-2 text-body-sm text-lilac-mist">
              Your answers stay on this device — nothing was shared.
            </p>
          </motion.header>

          <motion.section
            {...fadeUp(0.15)}
            className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
            aria-labelledby="private-hints-heading"
          >
            <h2
              id="private-hints-heading"
              className="text-caption font-semibold uppercase tracking-[0.16em] text-mint-vital"
            >
              Private — visible only on your device
            </h2>
            <ul className="mt-4 space-y-4">
              {unsatisfied.map((outcome) => (
                <li
                  key={outcome.criterionId}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lilac-mist/70"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-body-sm font-medium text-cloud-white">
                      {outcome.label}
                    </p>
                    <p className="mt-0.5 text-body-sm text-lilac-mist">
                      {outcome.hint}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.div {...fadeUp(0.22)} className="mt-8 flex flex-wrap gap-3">
            <PillButton
              size="lg"
              onClick={() => navigate({ name: "trials" })}
            >
              Explore other trials
            </PillButton>
          </motion.div>
        </div>
      </section>
    );
  }

  /* ── Eligible — the public record is the product ──────────── */
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <BackLink label="Back" />

        <motion.header {...fadeUp()} className="mt-6 text-center">
          <motion.div
            initial={reduce ? false : { scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-mint-vital/40 bg-mint-vital/15"
            aria-hidden="true"
          >
            <Check className="h-9 w-9 text-mint-vital" />
          </motion.div>
          <h1 className="mt-6 text-heading-sm font-semibold text-mint-vital sm:text-heading">
            Eligible
          </h1>
          <p className="mt-3 text-body text-pearl/85">
            Your eligibility was verified privately.
          </p>
          <p className="mt-2 text-body-sm text-pearl/70">
            The proof covers the supported typed criteria only.
          </p>
          <p className="mt-2 text-body-sm text-pearl/60">
            Your medical facts were used to prove the trial criteria. They
            were not sent to the COHORT server.
          </p>
        </motion.header>

        <motion.section
          {...fadeUp(0.15)}
          className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
          aria-label="Public record of this check"
        >
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
            Public record
          </p>
          <p className="mt-1.5 text-caption text-lilac-mist">
            This is all that exists outside your device.
          </p>
          <dl className="mt-4 divide-y divide-iris-border/50">
            <RecordRow icon={FlaskConical} label="Trial">
              {trial.title}
            </RecordRow>
            <RecordRow icon={BadgeCheck} label="Proof status">
              <span className="text-mint-vital">Verified</span>
            </RecordRow>
            <RecordRow icon={Clock} label="Verified at">
              {formatStamp(check.proof.verifiedAt)}
            </RecordRow>
            <RecordRow icon={Fingerprint} label="Proof ID">
              <span className="text-clinical-cyan">{check.proof.publicRef}</span>
            </RecordRow>
            <RecordRow icon={EyeOff} label="Nullifier">
              <span className="text-clinical-cyan">{check.proof.nullifier}</span>
            </RecordRow>
            <RecordRow icon={Send} label="Referral status">
              {check.referral?.status === "sealed" ? (
                <span className="text-mint-vital">Sealed</span>
              ) : check.referral?.status === "requested" ? (
                <span className="text-lilac-mist">Waiting for confirmation</span>
              ) : (
                <span className="text-lilac-mist">Not requested</span>
              )}
            </RecordRow>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-iris-border/50 pt-5">
            <PrivacyIndicator variant="chip" />
            <p className="text-caption text-lilac-mist">
              Your answers remain on this device — they are not part of this
              record.
            </p>
          </div>
        </motion.section>

        <motion.div {...fadeUp(0.22)} className="mt-8 flex flex-wrap gap-3">
          {!check.referral && (
            <PillButton
              size="lg"
              onClick={() => void requestReferral(checkId)}
            >
              Request referral
            </PillButton>
          )}
          <PillButton
            size="lg"
            variant="ghost"
            onClick={() => navigate({ name: "verification", checkId })}
          >
            View public verification
          </PillButton>
          <PillButton
            size="lg"
            variant="quiet"
            onClick={() => navigate({ name: "trials" })}
          >
            Find more trials
          </PillButton>
        </motion.div>
      </div>
    </section>
  );
}
