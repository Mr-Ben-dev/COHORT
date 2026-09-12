"use client";

import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { PillButton } from "@/components/brand/pill-button";
import { Tag } from "@/components/brand/status-pill";
import { BackLink } from "@/components/layout/back-link";
import { ReferralHandoffArt } from "@/components/artwork/referral-handoff-art";
import { useCohortStore } from "@/state/cohort-store";

function formatStamp(iso: string | undefined): string {
  return iso ? format(new Date(iso), "MMM d, yyyy · h:mm a") : "—";
}

function ReferralField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-field border border-iris-border/60 bg-deep-iris/40 p-4">
      <dt className="text-caption font-semibold uppercase tracking-[0.16em] text-lilac-mist">
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0 break-words text-body-sm font-medium text-cloud-white">
        {children}
      </dd>
    </div>
  );
}

export function ReferralView({ checkId }: { checkId: string }) {
  const check = useCohortStore((s) => s.checks[checkId]);
  const trial = useCohortStore((s) =>
    s.trials.find((t) => t.id === check?.trialId),
  );
  const navigate = useCohortStore((s) => s.navigate);
  const reduce = useReducedMotion();

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  if (!check || !trial || !check.referral) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <BackLink label="Back" />
        <div className="mx-auto mt-6 max-w-xl rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center">
          <h1 className="text-subheading font-semibold text-cloud-white">
            This referral isn&apos;t available.
          </h1>
          <p className="mt-2 text-body-sm text-pearl/70">
            Only eligible checks with a sealed proof can carry a referral.
          </p>
        </div>
      </section>
    );
  }

  const referral = check.referral;

  /* ── Requested — the commitment is being sealed ────────────── */
  if (referral.status === "requested") {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <BackLink label="Back" />

          <motion.header {...fadeUp()} className="mt-6">
            <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
              Referral
            </p>
            <h1 className="mt-3 text-[26px] font-semibold text-cloud-white sm:text-heading-sm">
              Sealing your referral…
            </h1>
            <p className="mt-3 text-body text-pearl/80">
              The site receives a verified eligibility result — not your
              medical record.
            </p>
          </motion.header>

          <motion.div
            {...fadeUp(0.1)}
            className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-mint-vital/40 bg-mint-vital/10"
                aria-hidden="true"
              >
                <Loader2 className="h-6 w-6 animate-spin text-mint-vital" />
              </span>
              <div>
                <p className="text-body font-semibold text-cloud-white">
                  Sealing referral commitment…
                </p>
                <p className="mt-1 text-body-sm text-pearl/70">
                  This usually takes a moment.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2 border-t border-iris-border/50 pt-5">
              {[
                "Confirming your verified proof reference",
                `Sealing the commitment for ${referral.siteName}`,
              ].map((step) => (
                <li
                  key={step}
                  className="flex items-center gap-2.5 text-body-sm text-pearl/70"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-mint-vital"
                    aria-hidden="true"
                  />
                  {step}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>
    );
  }

  /* ── Sealed — the positive handoff ────────────────────────── */
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <BackLink label="Back" />

        <motion.header {...fadeUp()} className="mt-6">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
            Referral
          </p>
          <h1 className="mt-3 text-[26px] font-semibold text-cloud-white sm:text-heading-sm">
            Your referral is sealed.
          </h1>
          <p className="mt-3 text-body text-pearl/80">
            The site receives a verified eligibility result — not your
            medical record.
          </p>
        </motion.header>

        <motion.div
          {...fadeUp(0.12)}
          className="mt-8 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
        >
          <div className="mx-auto max-w-[280px]">
            <ReferralHandoffArt />
          </div>

          <div className="mt-6 flex items-center gap-4">
            <motion.span
              initial={reduce ? false : { scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-mint-vital/40 bg-mint-vital/15"
              aria-hidden="true"
            >
              <Check className="h-7 w-7 text-mint-vital" />
            </motion.span>
            <div>
              <p className="text-subheading font-semibold text-mint-vital">
                Referral sealed
              </p>
              <p className="mt-0.5 text-caption text-lilac-mist">
                {formatStamp(referral.sealedAt)}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <ReferralField label="Site">{referral.siteName}</ReferralField>
            <ReferralField label="Trial">
              {trial.id} · {trial.condition}
            </ReferralField>
            <ReferralField label="Referral bounty">
              <span className="text-clinical-cyan">
                ${referral.bounty}
              </span>
            </ReferralField>
            <ReferralField label="Public reference">
              <span className="text-clinical-cyan">{referral.publicRef}</span>
            </ReferralField>
            <ReferralField label="Sealed at">
              {formatStamp(referral.sealedAt)}
            </ReferralField>
            <ReferralField label="Claim status">
              <Tag tone="lilac">Unclaimed</Tag>
            </ReferralField>
          </dl>
        </motion.div>

        <motion.p {...fadeUp(0.18)} className="mt-5 text-body-sm text-pearl/70">
          The research site can now verify your eligibility on the public
          ledger. They never see the facts behind the proof.
        </motion.p>

        <motion.div {...fadeUp(0.22)} className="mt-8 flex flex-wrap gap-3">
          <PillButton
            variant="ghost"
            onClick={() => navigate({ name: "verification", checkId })}
          >
            View public verification record
          </PillButton>
          <PillButton onClick={() => navigate({ name: "proofs" })}>
            Go to My Proofs
          </PillButton>
        </motion.div>
      </div>
    </section>
  );
}
