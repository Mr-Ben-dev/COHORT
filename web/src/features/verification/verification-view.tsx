"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { BadgeCheck, Check, EyeOff, Fingerprint, FlaskConical, Send, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { Tag } from "@/components/brand/status-pill";
import { BackLink } from "@/components/layout/back-link";
import { useCohortStore } from "@/state/cohort-store";
import { verificationService } from "@/services";

function formatStamp(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

function LedgerRow({
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
      <dd className="min-w-0 break-words text-right text-body-sm font-medium text-cloud-white">
        {children}
      </dd>
    </div>
  );
}

export function VerificationView({ checkId }: { checkId: string }) {
  const check = useCohortStore((s) => s.checks[checkId]);
  const trial = useCohortStore((s) =>
    s.trials.find((t) => t.id === check?.trialId),
  );
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const record = useMemo(
    () => (check && trial ? verificationService.getPublicRecord(check, trial.title) : null),
    [check, trial],
  );

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  if (!check || !trial || !record) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <BackLink label="Back" />
        <div className="mx-auto mt-6 max-w-xl rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center">
          <h1 className="text-subheading font-semibold text-cloud-white">
            This verification record isn&apos;t available.
          </h1>
          <p className="mt-2 text-body-sm text-pearl/70">
            Public records can only be derived from a completed check on
            this device.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <BackLink label="Back" />

        <motion.header {...fadeUp()} className="mt-6">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
            Public verification record
          </p>
          <h1 className="mt-3 text-[26px] font-semibold text-cloud-white sm:text-heading-sm">
            Verified — without your record revealed.
          </h1>
          <p className="mt-3 text-body text-pearl/80">
            This is the public view: everything a research site or sponsor
            can see.
          </p>
        </motion.header>

        {/* The ledger record */}
        <motion.section
          {...fadeUp(0.1)}
          className="mt-8 rounded-card-elevated border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
          aria-label="Public verification record"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-pill border border-mint-vital/40 bg-mint-vital/10 px-3.5 py-1.5 text-caption font-semibold text-mint-vital">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
            <Tag tone="lilac">{trial.phase}</Tag>
          </div>

          <dl className="mt-5 divide-y divide-iris-border/50">
            <LedgerRow icon={FlaskConical} label="Trial">
              {record.trialTitle}
            </LedgerRow>
            <LedgerRow icon={BadgeCheck} label="Proof">
              <span className="text-mint-vital">Eligibility proven</span>
            </LedgerRow>
            <LedgerRow icon={Fingerprint} label="Proof ID">
              <span className="text-clinical-cyan">{record.proof.publicRef}</span>
            </LedgerRow>
            <LedgerRow icon={EyeOff} label="Nullifier">
              <span className="text-clinical-cyan">{record.proof.nullifier}</span>
            </LedgerRow>
            <LedgerRow icon={Send} label="Referral commitment">
              {record.referral.commitment ? (
                <span>
                  <span className="text-mint-vital">Sealed</span>
                  {record.referral.publicRef && (
                    <span className="text-clinical-cyan">
                      {" "}
                      · {record.referral.publicRef}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-lilac-mist">None</span>
              )}
            </LedgerRow>
          </dl>

          <p className="mt-5 border-t border-iris-border/50 pt-5 text-caption text-lilac-mist">
            Environment · {check.proof.network}
          </p>
        </motion.section>

        {/* Public events timeline */}
        <motion.section
          {...fadeUp(0.16)}
          className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
          aria-labelledby="events-heading"
        >
          <h2
            id="events-heading"
            className="text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist"
          >
            Public events
          </h2>
          <ol className="relative mt-5 space-y-8 border-l border-iris-border/70 pl-7">
            {record.events.map((event) => (
              <li key={event.kind} className="relative">
                <span
                  className={
                    event.kind === "proof-verified"
                      ? "absolute -left-9 top-0.5 h-4 w-4 rounded-full border-2 border-mint-vital bg-iris-pulse"
                      : "absolute -left-9 top-0.5 h-4 w-4 rounded-full border-2 border-clinical-cyan bg-iris-pulse"
                  }
                  aria-hidden="true"
                />
                <p className="text-body font-medium text-cloud-white">
                  {event.label}
                </p>
                <p className="mt-0.5 text-caption text-lilac-mist">
                  {formatStamp(event.timestamp)}
                </p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* The contrast card — what can never be seen */}
        <motion.section
          {...fadeUp(0.22)}
          className="mt-6 rounded-card border border-lilac-mist/25 bg-cloud-white/[0.04] p-6 sm:p-8"
          aria-labelledby="never-heading"
        >
          <h2
            id="never-heading"
            className="text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist"
          >
            Never included
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {record.notIncluded.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-body-sm text-pearl/70"
              >
                <X className="h-4 w-4 shrink-0 text-fog" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-iris-border/40 pt-5 text-body-sm text-pearl/80">
            Verified, with nothing revealed — that contrast is the product.
          </p>
        </motion.section>

        <motion.div {...fadeUp(0.28)} className="mt-8 flex flex-wrap items-center gap-3">
          <PillButton
            variant="quiet"
            onClick={() => navigate({ name: "proofs" })}
          >
            View my proofs
          </PillButton>
        </motion.div>
      </div>
    </section>
  );
}
