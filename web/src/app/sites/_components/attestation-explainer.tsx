"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Plain-language explainer: what a "verified attestation" means — and
 * what it does not mean. Written from docs/circuits.md (§2 the
 * issuer-attested trio, §3 the trust boundary), in words a trial
 * coordinator can read without a cryptography background.
 *
 * It must never drift into over-claiming: the circuit guarantees correct
 * computation and correct attribution; everything about the truth of the
 * underlying medical record is a human/process trust assumption.
 */
export function AttestationExplainer() {
  return (
    <Card className="border-[#d6d6f0] bg-white">
      <CardHeader>
        <CardTitle className="text-lg">
          What a &ldquo;verified attestation&rdquo; means
        </CardTitle>
        <CardDescription>
          Plain language, for trial sites. Technical reference:{" "}
          <code className="font-mono text-xs">docs/circuits.md</code> in the
          repository (sections 2–3).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 text-sm leading-relaxed sm:grid-cols-2">
        <div>
          <p className="font-semibold text-emerald-800">It means</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[#4a4a6e]">
            <li>
              A clinic (an issuer) checked a person&apos;s attributes and
              published a fingerprint of that check — the attestation — to the
              contract.
            </li>
            <li>
              The contract confirmed the fingerprint: the issuer was
              authorized, and it wasn&apos;t published before.
            </li>
            <li>
              A proof shows the attested attributes satisfy the trial&apos;s
              rules (age window and similar) — without revealing the
              attributes themselves.
            </li>
            <li>
              One attestation can be used once per trial. The contract blocks
              re-use, so proofs can&apos;t be double-counted.
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-amber-900">It does NOT mean</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[#4a4a6e]">
            <li>
              Nobody on chain verified the medical record was real. The chain
              from record to clinic to attestation is off-chain human and
              process trust — the circuit can&apos;t prove a chart existed.
            </li>
            <li>
              The demo issuer is a demo key, not a medical authority. Until a
              real issuer key ceremony runs, issuance is demo-grade.
            </li>
            <li>
              A proof does not reveal who the person is, and the site never
              sees the record — only that the rules held.
            </li>
            <li>
              The counters say how many proofs were accepted, not how many
              participants were enrolled.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
