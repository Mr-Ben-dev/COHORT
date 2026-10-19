import type { Metadata } from "next";
import { VerifyClient } from "./_components/verify-client";

export const metadata: Metadata = {
  title: "Verify — COHORT",
  description:
    "Independent verification page: read the COHORT contract's public counters with no wallet. Live on-chain data or clearly-labeled sample data — never mixed.",
};

/**
 * Judge-facing verification page.
 *
 * Server renders the shell (SEO + metadata); the client component performs the
 * no-wallet read of /api/public-state and /api/attestation-counters and
 * displays the provenance badge. No wallet, no signing, no private data —
 * this page only ever reads public contract state.
 */
export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-[#f4f4fb] text-[#232265] antialiased">
      <VerifyClient />
    </main>
  );
}
