import type { Metadata } from "next";
import { SiteConsole } from "./_components/site-console";

export const metadata: Metadata = {
  title: "Site console — COHORT",
  description:
    "Trial-site operator view: paste a trial ID and read live on-chain proof counters with no wallet. Live on-chain or clearly-labeled sample data — never mixed.",
};

/**
 * COHORT — /sites: trial-SITE operator console.
 *
 * Distinct from /verify (the judge-facing page): a site operator pastes
 * their trial ID and sees the trial's on-chain proof activity with NO
 * wallet required. Server renders the shell; the client component performs
 * the no-wallet same-origin reads of /api/public-state and
 * /api/attestation-counters and displays the provenance badge.
 *
 * Provenance semantics are shared with web/src/lib/cohort-verify.mjs
 * (C2's no-wallet module): "live-onchain" only on the exact live source
 * string, anything else is clearly-labeled sample data. All-or-nothing —
 * the page never blends live-looking numbers with placeholders.
 */
export default function SitesPage() {
  return (
    <main className="min-h-screen bg-[#f4f4fb] text-[#232265] antialiased">
      <SiteConsole />
    </main>
  );
}
