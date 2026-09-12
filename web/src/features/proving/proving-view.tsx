"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Wallet } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PillButton } from "@/components/brand/pill-button";
import { IconNode } from "@/components/brand/icon-node";
import { PrivacyIndicator } from "@/components/privacy/privacy-indicator";
import { BackLink } from "@/components/layout/back-link";
import { useCohortStore } from "@/state/cohort-store";
import { preloadCohortDapp } from "@/lib/cohort-dapp";
import {
  PROOF_STAGES,
  PROOF_STAGE_COPY,
  type ProofStage,
  type WalletProvider,
} from "@/domain/types";
import { cn } from "@/lib/utils";

type StageState = "done" | "active" | "pending";

function StageMarker({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-mint-vital/40 bg-mint-vital/15"
        aria-hidden="true"
      >
        <Check className="h-4 w-4 text-mint-vital" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="relative flex h-7 w-7 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-clinical-cyan" />
        <motion.span
          className="absolute inset-0 rounded-full border border-clinical-cyan"
          initial={{ opacity: 0.7, scale: 0.55 }}
          animate={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span className="h-2.5 w-2.5 rounded-full border-2 border-lilac-mist/40" />
    </span>
  );
}

function StageRow({
  stage,
  state,
}: {
  stage: ProofStage;
  state: StageState;
}) {
  const copy = PROOF_STAGE_COPY[stage];
  return (
    <motion.li
      layout
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-4"
    >
      <StageMarker state={state} />
      <div className="min-w-0">
        <p
          className={cn(
            "text-body",
            state === "active" && "font-semibold text-cloud-white",
            state === "done" && "text-pearl",
            state === "pending" && "text-lilac-mist/50",
          )}
        >
          {copy.label}
        </p>
        {state === "active" && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 text-body-sm text-pearl/70"
          >
            {copy.detail}
          </motion.p>
        )}
      </div>
    </motion.li>
  );
}

const WALLET_PROVIDERS: { id: WalletProvider; note: string }[] = [
  { id: "1AM", note: "Midnight wallet · browser extension (gold path)" },
  { id: "Lace", note: "Needs a local proof-server — not the COHORT gold path" },
];

export function ProvingView({ trialId }: { trialId: string }) {
  const activeProving = useCohortStore((s) => s.activeProving);
  const trial = useCohortStore((s) => s.trials.find((t) => t.id === trialId));
  const wallet = useCohortStore((s) => s.wallet);
  const connectWallet = useCohortStore((s) => s.connectWallet);
  const approveWallet = useCohortStore((s) => s.approveWallet);
  const cancelProving = useCohortStore((s) => s.cancelProving);
  const reduce = useReducedMotion();

  useEffect(() => {
    void preloadCohortDapp().catch(() => {});
  }, []);

  /*
   * Latch the last non-null proving state. When the flow completes or is
   * canceled, the store clears `activeProving` one render before this view
   * finishes its exit transition — without the latch the quiet card would
   * flash over the stage list during that handoff. The latch is written
   * from a store subscription (an external-system event) and is read only
   * once `activeProving` has already been cleared.
   */
  const [lastProving, setLastProving] = useState(activeProving);
  const proving = activeProving ?? lastProving;

  useEffect(
    () =>
      useCohortStore.subscribe((state) => {
        if (state.activeProving !== null) setLastProving(state.activeProving);
      }),
    [],
  );

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  /* No flow in progress (e.g. after a session refresh). */
  if (!proving) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-xl">
          <BackLink label="All trials" />
          <div className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-8 text-center">
            <h1 className="text-subheading font-semibold text-cloud-white">
              No check in progress.
            </h1>
            <p className="mt-2 text-body-sm text-pearl/70">
              Nothing is running on this device right now.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const stage = proving.stage;
  const stageIndex = PROOF_STAGES.indexOf(stage);

  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8">
      <div className="mx-auto max-w-xl py-16">
        <BackLink label="Back" />

        <motion.header {...fadeUp()} className="mt-6">
          <PrivacyIndicator variant="chip" />
          <h1 className="mt-5 text-[26px] font-semibold text-cloud-white sm:text-heading-sm">
            Checking your eligibility privately…
          </h1>
          {trial && (
            <p className="mt-3 text-body-sm text-lilac-mist">
              {trial.title} · {trial.id}
            </p>
          )}
          <p className="mt-2 text-body-sm text-pearl/70">
            The proof covers the supported typed criteria only. COHORT does
            not receive your private health facts.
          </p>
        </motion.header>

        <motion.div
          {...fadeUp(0.1)}
          className="mt-7 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
          aria-live="polite"
        >
          {stage === "confirmed" && (
            <motion.div
              initial={reduce ? false : { scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-mint-vital/40 bg-mint-vital/15"
              aria-hidden="true"
            >
              <Check className="h-8 w-8 text-mint-vital" />
            </motion.div>
          )}
          <ol className="space-y-5">
            {PROOF_STAGES.map((s, i) => (
              <StageRow
                key={s}
                stage={s}
                state={
                  i < stageIndex ? "done" : i === stageIndex ? "active" : "pending"
                }
              />
            ))}
          </ol>
        </motion.div>

        {/* Wallet interlude — the single confirmation in the whole flow */}
        {stage === "wallet-approval" && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 rounded-card border border-iris-border bg-cloud-white/[0.06] p-6 sm:p-8"
          >
            {wallet.status === "disconnected" ? (
              <>
                <h2 className="text-subheading font-semibold text-cloud-white">
                  Connect your wallet
                </h2>
                <p className="mt-2 text-body-sm text-pearl/70">
                  Choose 1AM to sign the proof — the only confirmation
                  you&apos;ll make. The 1AM browser extension is the current
                  gold path on desktop. COHORT will not create a fake wallet.
                </p>
                <div className="mt-5 space-y-3">
                  {WALLET_PROVIDERS.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center gap-4 rounded-field border border-iris-border bg-deep-iris/50 p-4"
                    >
                      <IconNode tone="lilac">
                        <Wallet className="h-5 w-5" aria-hidden="true" />
                      </IconNode>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-cloud-white">
                          {provider.id}
                        </p>
                        <p className="text-caption text-lilac-mist">
                          {provider.note}
                        </p>
                      </div>
                      <PillButton
                        size="sm"
                        className="ml-auto shrink-0"
                        onClick={() => void connectWallet(provider.id)}
                      >
                        Connect
                      </PillButton>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <IconNode tone="mint">
                    <Wallet className="h-5 w-5" aria-hidden="true" />
                  </IconNode>
                  <div>
                    <h2 className="text-subheading font-semibold text-cloud-white">
                      {wallet.status === "connecting"
                        ? `Connecting to ${wallet.provider}…`
                        : `Approve in ${wallet.provider}`}
                    </h2>
                    <p className="mt-1 text-body-sm text-pearl/70">
                      One confirmation — the proof, not your facts, is what
                      gets signed.
                    </p>
                  </div>
                </div>
                <PillButton
                  className="mt-5 w-full"
                  disabled={wallet.status === "connecting"}
                  onClick={() => void approveWallet()}
                >
                  Approve proof request
                </PillButton>
              </>
            )}
          </motion.div>
        )}

        {proving.error && (
          <p className="mt-4 text-body-sm text-pearl" role="alert">
            {proving.error}
          </p>
        )}

        <div className="mt-6">
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 rounded-pill border border-iris-border px-5 py-2.5 text-body-sm font-medium text-lilac-mist transition-colors hover:border-lilac-mist/50 hover:text-cloud-white">
              How this works
              <ChevronDown
                className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 rounded-card border border-iris-border/60 bg-cloud-white/[0.04] p-5 text-body-sm leading-relaxed text-pearl/75">
              Your health facts stay on your device while Midnight verifies
              the typed eligibility rules. Only the proof — never the facts —
              is submitted for public verification. The proof covers the
              supported typed criteria only. The wallet proving environment is
              a separate trust boundary from the COHORT server.
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-8 flex justify-center">
          <PillButton variant="quiet" onClick={cancelProving}>
            Cancel check
          </PillButton>
        </div>
      </div>
    </section>
  );
}
