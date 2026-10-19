"use client";

import { useEffect, useState } from "react";
import { ProvenanceBadge } from "./provenance-badge";
import { fetchVerifyState } from "@/lib/cohort-verify.mjs";
import { COHORT_CONTRACT_ADDRESS } from "@/lib/cohort-origin";

type Counters = {
  proven: number;
  attestationCount: number;
  attestationsVerified: number;
  referralCount: number;
};

type VerifyState = {
  provenance: "live-onchain" | "sample-data";
  live: boolean;
  source: string | null;
  networkId: string | null;
  contractAddress: string | null;
  counters: Counters | null;
  sample: (Counters & { sampleData?: boolean }) | null;
  isSample: boolean;
  error: string | null;
  fetchedAt: string;
};

const COUNTER_LABELS: { key: keyof Counters; label: string; plain: string }[] = [
  {
    key: "proven",
    label: "Eligibility proofs accepted",
    plain:
      "How many times someone proved, with a private proof, that they qualify for a trial — without revealing any health facts.",
  },
  {
    key: "attestationCount",
    label: "Issuer attestations published",
    plain:
      "Signed statements from clinics that they checked a person for eligibility. Only the signature and a fingerprint appear on chain.",
  },
  {
    key: "attestationsVerified",
    label: "Attestations verified on chain",
    plain:
      "How many of those signed statements were checked and confirmed by the contract itself.",
  },
  {
    key: "referralCount",
    label: "Referral records",
    plain:
      "One-way fingerprints of eligibility referrals. They can't be linked back to a person.",
  },
];

export function VerifyClient() {
  const [state, setState] = useState<VerifyState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = (await fetchVerifyState()) as VerifyState;
        if (!cancelled) setState(result);
      } catch (err) {
        if (!cancelled) {
          setState({
            provenance: "sample-data",
            live: false,
            source: null,
            networkId: null,
            contractAddress: null,
            counters: null,
            sample: { proven: 0, attestationCount: 0, attestationsVerified: 0, referralCount: 0, sampleData: true },
            isSample: true,
            error:
              "The verification read failed before it could be classified: " +
              String(err?.message || err),
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const numbers: Counters | null = state
    ? state.live && state.counters
      ? state.counters
      : (state.sample as Counters | null)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      {/* ── Header ─────────────────────────────────────────── */}
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#7c7c9e]">
        COHORT · Independent verification
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
        Verify the contract yourself
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4a4a6e]">
        This page reads the COHORT smart contract&apos;s public counters
        directly — no wallet, no sign-in, nothing to install. If the badge
        below is green, the numbers came from the live chain. If it is amber,
        you are looking at placeholder numbers for layout while the backend
        connects.
      </p>

      <div className="mt-5">
        {state ? (
          <ProvenanceBadge provenance={state.provenance} />
        ) : (
          <span
            role="status"
            className="inline-flex items-center gap-2 rounded-full border border-[#d6d6f0] bg-white px-4 py-1.5 text-sm text-[#7c7c9e]"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#b1a6f6]" />
            Reading public state…
          </span>
        )}
      </div>

      {/* ── Contract card ──────────────────────────────────── */}
      <section
        aria-label="Contract address"
        className="mt-8 rounded-2xl border border-[#d6d6f0] bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-[#7c7c9e]">
          Contract
        </h2>
        <p className="mt-3 break-all font-mono text-sm leading-relaxed">
          {COHORT_CONTRACT_ADDRESS}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#4a4a6e]">
          <span>
            Network:{" "}
            <strong className="font-medium">
              {state?.networkId ?? "preprod"}
            </strong>
          </span>
          <span>
            Source:{" "}
            <strong className="font-medium">
              {state?.source ?? "not yet loaded"}
            </strong>
          </span>
        </div>
      </section>

      {/* ── Counters ───────────────────────────────────────── */}
      <section
        aria-label="Public counters"
        className="mt-8 rounded-2xl border border-[#d6d6f0] bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-[#7c7c9e]">
          Public counters
        </h2>
        {state?.isSample && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-medium">Sample data.</strong> The numbers
            below are placeholders for layout only — they do not come from the
            chain.
            {state.error && (
              <span className="mt-1 block text-amber-800">{state.error}</span>
            )}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COUNTER_LABELS.map(({ key, label, plain }) => (
            <div
              key={key}
              className="rounded-xl border border-[#e4e4f5] bg-[#f4f4fb] p-5"
            >
              <dt className="text-sm text-[#4a4a6e]">{label}</dt>
              <dd
                className="mt-1 text-4xl font-medium tabular-nums"
                data-testid={`counter-${key}`}
              >
                {numbers ? numbers[key].toLocaleString("en-US") : "—"}
              </dd>
              <dd className="mt-2 text-sm leading-relaxed text-[#7c7c9e]">
                {plain}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Explainer ──────────────────────────────────────── */}
      <section
        aria-label="What am I looking at"
        className="mt-8 rounded-2xl border border-[#d6d6f0] bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-medium">What am I looking at?</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[#4a4a6e]">
          <p>
            <strong className="font-medium text-[#232265]">
              COHORT answers one question:
            </strong>{" "}
            “Prove you qualify for a clinical trial — without handing over
            your medical record.” A clinic checks you, the contract records
            that it happened, and you carry a private proof that your facts
            stay on your own device.
          </p>
          <p>
            <strong className="font-medium text-[#232265]">
              These counters are the public part.
            </strong>{" "}
            The contract keeps a few tally numbers anyone can read: how many
            eligibility proofs it accepted, how many clinic attestations were
            published and verified, and how many referral records exist. They
            contain no names, no ages, no diagnoses — nothing that identifies
            anyone.
          </p>
          <p>
            <strong className="font-medium text-[#232265]">
              No wallet needed.
            </strong>{" "}
            This page only reads those public tallies through our API. It
            never asks you to connect a wallet, sign anything, or share any
            health information. Reading is free and anonymous.
          </p>
          <p>
            <strong className="font-medium text-[#232265]">
              Green means live; amber means sample.
            </strong>{" "}
            A green “LIVE ON-CHAIN” badge means the numbers were read from the
            deployed contract on Midnight Preprod just now. An amber
            “SAMPLE DATA” badge means the backend couldn’t reach the chain
            (for example, the indexer token isn’t configured) and the page is
            showing placeholder numbers so you can see the layout. The two are
            never mixed: it’s all live or all sample, and the page always
            says which.
          </p>
        </div>
      </section>

      <p className="mt-8 text-xs text-[#7c7c9e]">
        Last checked:{" "}
        {state ? new Date(state.fetchedAt).toLocaleString() : "—"}
      </p>
    </div>
  );
}
