"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/brand/pill-button";
import { Tag } from "@/components/brand/status-pill";
import { PrivacyIndicator } from "@/components/privacy/privacy-indicator";
import { BackLink } from "@/components/layout/back-link";
import { useCohortStore } from "@/state/cohort-store";
import { cn } from "@/lib/utils";

/* ── Shared question rhythm ─────────────────────────────────── */

const PRIVATE_DOT = "h-1.5 w-1.5 shrink-0 rounded-full bg-mint-vital";
const PRIVATE_CAPTION = "text-caption text-mint-vital/80";

function QuestionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p
        id={id}
        className="flex items-center gap-2.5 text-body font-medium text-cloud-white"
      >
        <span className={PRIVATE_DOT} aria-hidden="true" />
        {children}
      </p>
      <span className={PRIVATE_CAPTION}>stays on this device</span>
    </div>
  );
}

function TogglePill({
  active,
  children,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-pill border px-6 py-2.5 text-body-sm font-medium transition-colors",
        active
          ? "border-iris-pulse bg-iris-pulse text-cloud-white"
          : "border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
      )}
    >
      {children}
    </button>
  );
}

/* ── The private check ──────────────────────────────────────── */

export function CheckView({ trialId }: { trialId: string }) {
  const trial = useCohortStore((s) => s.trials.find((t) => t.id === trialId));
  const input = useCohortStore((s) => s.inputs[trialId]);
  const setAnswer = useCohortStore((s) => s.setAnswer);
  const startCheck = useCohortStore((s) => s.startCheck);
  const reduce = useReducedMotion();

  /* Draft strings keep typed decimals ("7.") from being rewritten mid-entry. */
  const [ageDraft, setAgeDraft] = useState(() =>
    input?.age !== undefined ? String(input.age) : "",
  );
  const [clinicalDraft, setClinicalDraft] = useState(() =>
    typeof input?.clinicalValue === "number" ? String(input.clinicalValue) : "",
  );

  if (!trial) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <BackLink label="Back to trials" />
        <div className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center">
          <h1 className="text-subheading font-semibold text-cloud-white">
            This check isn&apos;t available.
          </h1>
          <p className="mt-2 text-body-sm text-pearl/70">
            The study this check belongs to couldn&apos;t be found.
          </p>
        </div>
      </section>
    );
  }

  const ageId = `age-${trialId}`;
  const condId = `condition-${trialId}`;
  const medId = `medication-${trialId}`;
  const clinicalId = `clinical-${trialId}`;
  const hintId = `check-cta-hint-${trialId}`;

  const answered = {
    age: typeof input?.age === "number",
    condition: typeof input?.hasCondition === "boolean",
    medication: typeof input?.medication === "string" && input.medication.length > 0,
    clinical: input?.clinicalValue !== undefined && input?.clinicalValue !== null,
  };
  const remaining = Object.values(answered).filter((v) => !v).length;
  const complete = remaining === 0;

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const clinical = trial.policy.clinical;
  const clinicalPlaceholder =
    clinical.kind === "number"
      ? clinical.match === "band"
        ? `${clinical.min ?? ""}–${clinical.max ?? ""}`
        : String(clinical.min ?? clinical.max ?? "")
      : "";

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <BackLink label="Back to trial" />

        <motion.header {...fadeUp()} className="mt-4">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-clinical-cyan">
            Private check
          </p>
          <h1 className="mt-3 text-[26px] font-semibold text-cloud-white sm:text-heading-sm">
            Let&apos;s check privately.
          </h1>
          <p className="mt-3 text-body text-pearl/80">
            {trial.condition} · {trial.id}
          </p>
          <p className="mt-2 text-body-sm text-lilac-mist">
            The proof covers the supported typed criteria only. Free-text
            eligibility is not proven. Answers are self-attested on this
            device. COHORT does not receive your private health facts.
          </p>
        </motion.header>

        <motion.div {...fadeUp(0.08)} className="mt-6">
          <PrivacyIndicator variant="banner" />
        </motion.div>

        <motion.div
          {...fadeUp(0.12)}
          className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
        >
          <div className="space-y-7">
            {/* 1 — Age */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <Label
                  htmlFor={ageId}
                  className="text-body font-medium text-cloud-white"
                >
                  <span className={PRIVATE_DOT} aria-hidden="true" />
                  Your age
                </Label>
                <span className={PRIVATE_CAPTION}>stays on this device</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  id={ageId}
                  type="number"
                  inputMode="numeric"
                  value={ageDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAgeDraft(v);
                    const n = parseInt(v, 10);
                    setAnswer(trialId, {
                      age: Number.isNaN(n) ? undefined : n,
                    });
                  }}
                  placeholder="42"
                  className="h-12 w-32 rounded-field border-iris-border bg-deep-iris/60 text-body text-cloud-white placeholder:text-lilac-mist/50"
                />
                <span className="text-body-sm text-lilac-mist">years</span>
              </div>
            </div>

            {/* 2 — Condition */}
            <div>
              <QuestionHeading id={condId}>
                {trial.policy.condition.question}
              </QuestionHeading>
              <div
                className="mt-3 flex flex-wrap gap-3"
                role="group"
                aria-labelledby={condId}
              >
                <TogglePill
                  active={input?.hasCondition === true}
                  onClick={() => setAnswer(trialId, { hasCondition: true })}
                  ariaLabel="Yes — you have this diagnosis"
                >
                  Yes
                </TogglePill>
                <TogglePill
                  active={input?.hasCondition === false}
                  onClick={() => setAnswer(trialId, { hasCondition: false })}
                  ariaLabel="No — you do not have this diagnosis"
                >
                  No
                </TogglePill>
              </div>
            </div>

            {/* 3 — Medication */}
            <div>
              <QuestionHeading id={medId}>
                {trial.policy.medication.question}
              </QuestionHeading>
              <div
                className="mt-3 flex flex-col gap-2.5"
                role="group"
                aria-labelledby={medId}
              >
                {trial.policy.medication.options.map((option) => {
                  const selected = input?.medication === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAnswer(trialId, { medication: option.id })}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-pill border px-5 py-3 text-left text-body-sm font-medium transition-colors",
                        selected
                          ? "border-iris-pulse bg-iris-pulse text-cloud-white"
                          : "border-iris-border text-lilac-mist hover:border-lilac-mist/50 hover:text-cloud-white",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full transition-colors",
                          selected ? "bg-mint-vital" : "bg-lilac-mist/40",
                        )}
                        aria-hidden="true"
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 — Clinical measure */}
            <div>
              {clinical.kind === "number" ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <Label
                      htmlFor={clinicalId}
                      className="text-body font-medium text-cloud-white"
                    >
                      <span className={PRIVATE_DOT} aria-hidden="true" />
                      {clinical.question}
                    </Label>
                    <span className={PRIVATE_CAPTION}>stays on this device</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Input
                      id={clinicalId}
                      type="number"
                      inputMode="decimal"
                      value={clinicalDraft}
                      onChange={(e) => {
                        const v = e.target.value;
                        setClinicalDraft(v);
                        const n = Number.parseFloat(v);
                        setAnswer(trialId, {
                          clinicalValue: Number.isNaN(n) ? undefined : n,
                        });
                      }}
                      placeholder={clinicalPlaceholder}
                      className="h-12 w-32 rounded-field border-iris-border bg-deep-iris/60 text-body text-cloud-white placeholder:text-lilac-mist/50"
                    />
                    {clinical.unit && (
                      <span className="text-body-sm text-lilac-mist">
                        {clinical.unit}
                      </span>
                    )}
                  </div>
                  {clinical.hint && (
                    <p className="mt-2.5 text-caption text-lilac-mist">
                      {clinical.hint}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <QuestionHeading id={clinicalId}>
                    {clinical.question}
                  </QuestionHeading>
                  <div
                    className="mt-3 flex flex-wrap gap-3"
                    role="group"
                    aria-labelledby={clinicalId}
                  >
                    <TogglePill
                      active={input?.clinicalValue === true}
                      onClick={() => setAnswer(trialId, { clinicalValue: true })}
                      ariaLabel="Yes"
                    >
                      Yes
                    </TogglePill>
                    <TogglePill
                      active={input?.clinicalValue === false}
                      onClick={() => setAnswer(trialId, { clinicalValue: false })}
                      ariaLabel="No"
                    >
                      No
                    </TogglePill>
                  </div>
                  {clinical.hint && (
                    <p className="mt-2.5 text-caption text-lilac-mist">
                      {clinical.hint}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Future FHIR import — disabled, honestly labeled */}
        <motion.div {...fadeUp(0.16)} className="mt-5 flex flex-wrap items-center gap-3">
          <PillButton variant="ghost" disabled>
            Import from your health record
          </PillButton>
          <span title="FHIR import arrives with provider integrations">
            <Tag tone="lilac">Coming soon</Tag>
          </span>
        </motion.div>

        {/* CTA — enabled only when all four answers exist */}
        <motion.div {...fadeUp(0.2)} className="mt-8">
          <PillButton
            size="lg"
            className="w-full sm:w-auto"
            disabled={!complete}
            aria-describedby={hintId}
            onClick={() => void startCheck(trial)}
          >
            Prove eligibility
          </PillButton>
          <p
            id={hintId}
            aria-live="polite"
            className={cn(
              "mt-3 max-w-md text-body-sm",
              complete ? "text-pearl/70" : "text-mint-vital",
            )}
          >
            {complete
              ? "A local preview runs first. Connect 1AM only appears if that preview matches the typed rules. If it does not, no wallet is used and nothing is sent."
              : `Answer the ${remaining} remaining question${remaining === 1 ? "" : "s"} to continue.`}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
