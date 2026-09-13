"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { useCohortStore, type View } from "@/state/cohort-store";
import { LandingPage } from "@/features/landing/landing-page";
import { TrialsView } from "@/features/discovery/trials-view";
import { TrialDetailView } from "@/features/trial-detail/trial-detail-view";
import { CheckView } from "@/features/check/check-view";
import { ProvingView } from "@/features/proving/proving-view";
import { ResultView } from "@/features/result/result-view";
import { ReferralView } from "@/features/referral/referral-view";
import { VerificationView } from "@/features/verification/verification-view";
import { MyProofsView } from "@/features/proofs/my-proofs-view";
import { ProfileView } from "@/features/profile/profile-view";

function viewKey(view: View): string {
  switch (view.name) {
    case "home":
      return "home";
    case "trials":
      return "trials";
    case "trial":
      return `trial-${view.trialId}`;
    case "check":
      return `check-${view.trialId}`;
    case "proving":
      return `proving-${view.trialId}`;
    case "result":
      return `result-${view.checkId}`;
    case "referral":
      return `referral-${view.checkId}`;
    case "verification":
      return `verification-${view.checkId}`;
    case "proofs":
      return "proofs";
    case "profile":
      return "profile";
  }
}

function ViewScreen({ view }: { view: View }) {
  switch (view.name) {
    case "home":
      return <LandingPage />;
    case "trials":
      return <TrialsView />;
    case "trial":
      return <TrialDetailView trialId={view.trialId} />;
    case "check":
      return <CheckView trialId={view.trialId} />;
    case "proving":
      return <ProvingView trialId={view.trialId} />;
    case "result":
      return <ResultView checkId={view.checkId} />;
    case "referral":
      return <ReferralView checkId={view.checkId} />;
    case "verification":
      return <VerificationView checkId={view.checkId} />;
    case "proofs":
      return <MyProofsView />;
    case "profile":
      return <ProfileView />;
  }
}

/**
 * AppShell — the single COHORT surface. The whole product is one coherent
 * application: marketing → discovery → private check → proof → result →
 * referral → verification, with no route changes, ever.
 */
export function AppShell() {
  const view = useCohortStore((s) => s.view);
  const pendingScroll = useCohortStore((s) => s.pendingScroll);
  const ensureTrials = useCohortStore((s) => s.ensureTrials);

  // Warm the public trial data as soon as the user leaves the landing page.
  useEffect(() => {
    if (view.name !== "home") ensureTrials();
  }, [view, ensureTrials]);

  // Scroll management: honor pending section anchors, otherwise start views at the top.
  useEffect(() => {
    if (pendingScroll) {
      const el = document.querySelector(pendingScroll);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, pendingScroll]);

  return (
    <div className="flex min-h-screen flex-col bg-deep-iris">
      <SiteNav />
      <main id="main" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewKey(view)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ViewScreen view={view} />
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter />
    </div>
  );
}
