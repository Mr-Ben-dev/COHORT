"use client";

/**
 * COHORT — /demo: two-tier demo running the SAME compiled circuits.
 *
 * Tier 1 "Try in browser (no install)": the real proveEligible circuit from
 * packages/contract/managed, executed in this page via the Compact runtime
 * simulator (@/lib/demo-runner). Witnesses stay in React state — zero
 * network I/O on this path. Every result carries "simulated proof — not
 * on-chain".
 *
 * Tier 2 "Prove with wallet": wallet connect imported from
 * packages/dapp/src/wallets.mjs (GeroWallet primary, 1AM fallback — never
 * re-implemented here), real proof via packages/dapp/src/prove.mjs, then the
 * TRUTH GATE: success UI renders only after packages/dapp/src/truth-gate.mjs
 * (C1) confirms the ledger effect via waitForLedgerEffect +
 * assertClaimedSuccess. Until then: "submitted — waiting for on-chain
 * confirmation…".
 *
 * UI: light, clinical, trustworthy. No dark-cyberpunk anywhere.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SimResult =
  | { status: "idle" }
  | { status: "running" }
  | { status: "proven"; proven: string; spent: string; referrals: string }
  | { status: "failed"; message: string };

type AttestedGate = { allowed: boolean; reason: string | null; probe: string | null };

type WalletStage =
  | "idle"
  | "connecting"
  | "ready"
  | "submitting"
  | "submitted" // tx in flight — truth gate pending
  | "confirmed"
  | "failed";

type WalletResult =
  | { stage: "idle" | "connecting" | "ready" | "submitting" }
  | { stage: "submitted"; txHash: string | null; txId: string | null; note: string }
  | { stage: "confirmed"; txHash: string | null; observedAtBlock: number | null; baselineProven: number; attempts: number; source: string }
  | { stage: "failed"; message: string; txHash: string | null };

type TrialOption = {
  trialId: string;
  title: string;
  minAge: number;
  maxAge: number;
  requireCondition: boolean;
  forbidMedication: boolean;
};

const DISCLAIMER = "simulated proof — not on-chain";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f4f4fb] text-[#232265]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <DemoHeader />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <TierOneCard />
          <TierTwoCard />
        </div>
        <SeamNotes />
      </div>
    </main>
  );
}

function DemoHeader() {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-[#3f3ccd] text-white hover:bg-[#3f3ccd]">COHORT demo</Badge>
        <Badge variant="outline" className="border-[#6a67e6] text-[#3b38b7]">
          same circuits, two tiers
        </Badge>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Prove you qualify for a clinical trial — without handing over your medical record.
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#3b38b7]">
        Both tiers below run the <span className="font-medium">same compiled circuits</span> from the COHORT
        contract. Tier 1 runs them in this page with the Compact runtime simulator — nothing is installed,
        nothing leaves the browser. Tier 2 runs them for real against Preprod with your wallet, and the
        success screen appears only after the ledger effect is confirmed on-chain.
      </p>
      <Alert className="mt-5 border-[#6a67e6] bg-white">
        <AlertTitle className="text-[#232265]">Honesty labels</AlertTitle>
        <AlertDescription className="text-[#3b38b7]">
          Tier 1 results are <span className="font-medium">“{DISCLAIMER}”</span> — a real circuit execution,
          but local. Tier 2 results are on-chain proofs, and the UI refuses to call them successful until the
          truth gate confirms the ledger changed.
        </AlertDescription>
      </Alert>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Tier 1 — in-browser simulator
// ---------------------------------------------------------------------------

function TierOneCard() {
  const [age, setAge] = useState("31");
  const [condition, setCondition] = useState(true);
  const [medication, setMedication] = useState(false);
  const [trialByte, setTrialByte] = useState("1");
  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("80");
  const [result, setResult] = useState<SimResult>({ status: "idle" });
  const [gate, setGate] = useState<AttestedGate | null>(null);
  const [buildInfo, setBuildInfo] = useState<string | null>(null);

  // Probe the compiled build once: which circuits exist, has the ceremony run?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const runner = await import("@/lib/demo-runner.mjs");
        const mod = await runner.loadContractModule();
        if (cancelled) return;
        setBuildInfo(`contract build: ${mod.source.split("/").slice(-4).join("/")}`);
        const probe = runner.probeCeremony(mod);
        const g = runner.gateProveAttested({ ceremonyComplete: probe.ceremonyComplete });
        setGate({ allowed: g.allowed, reason: g.reason, probe: probe.reason });
      } catch (err) {
        if (cancelled) return;
        setBuildInfo(`contract failed to load: ${err instanceof Error ? err.message : String(err)}`);
        setGate({ allowed: false, reason: "Compiled contract could not be loaded in this browser.", probe: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async () => {
    setResult({ status: "running" });
    try {
      const runner = await import("@/lib/demo-runner.mjs");
      const mod = await runner.loadContractModule();
      const out = runner.runProveEligibleSimulator(mod, {
        witnesses: runner.makeWitnesses({ age, condition, medication }),
        trialByte: Number(trialByte) || 1,
        minAge: BigInt(minAge || "0"),
        maxAge: BigInt(maxAge || "0"),
        requireCondition: true,
        forbidMedication: true,
      });
      setResult({ status: "proven", proven: out.ledger.proven, spent: out.ledger.spent, referrals: out.ledger.referrals });
    } catch (err) {
      setResult({ status: "failed", message: err instanceof Error ? err.message : String(err) });
    }
  }, [age, condition, medication, trialByte, minAge, maxAge]);

  return (
    <Card className="border-[#b1a6f6] bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">Tier 1 — Try in browser</CardTitle>
          <Badge className="bg-[#5cffb1] text-[#161658] hover:bg-[#5cffb1]">no install</Badge>
        </div>
        <CardDescription className="text-[#3b38b7]">
          Real proveEligible circuit, Compact runtime simulator, in this tab. Private answers never leave
          the page — there is no network call on this path.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="t1-age">Age</Label>
            <Input id="t1-age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t1-trial">Trial (demo byte)</Label>
            <Input id="t1-trial" inputMode="numeric" value={trialByte} onChange={(e) => setTrialByte(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t1-min">Min age (trial policy)</Label>
            <Input id="t1-min" inputMode="numeric" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t1-max">Max age (trial policy)</Label>
            <Input id="t1-max" inputMode="numeric" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={condition} onCheckedChange={(v) => setCondition(v === true)} />
            Has required condition
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={medication} onCheckedChange={(v) => setMedication(v === true)} />
            Takes excluded medication
          </label>
        </div>
        <Button onClick={run} disabled={result.status === "running"} className="w-full bg-[#3f3ccd] hover:bg-[#3b38b7]">
          {result.status === "running" ? "Running circuit…" : "Run proveEligible in this browser"}
        </Button>

        <SimResultPanel result={result} />

        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">proveAttested (issuer-attested path)</p>
            <Badge variant="outline" className="border-[#b1a6f6] text-[#3b38b7]">attested path not live yet</Badge>
          </div>
          <Button disabled className="w-full" variant="outline">
            Run proveAttested in this browser
          </Button>
          {gate ? (
            <p className="text-xs leading-relaxed text-[#3b38b7]">
              <span className="font-medium">Why disabled: </span>
              {gate.reason ?? "ceremony state unknown"}
              {gate.probe ? ` (probe: ${gate.probe})` : ""}
            </p>
          ) : (
            <p className="text-xs text-[#3b38b7]">Checking ceremony state…</p>
          )}
        </div>
        {buildInfo && <p className="text-[11px] text-[#6a67e6]">{buildInfo}</p>}
      </CardContent>
    </Card>
  );
}

function SimResultPanel({ result }: { result: SimResult }) {
  if (result.status === "idle") return null;
  if (result.status === "running") {
    return (
      <Alert className="border-[#6a67e6] bg-[#f4f4fb]">
        <AlertTitle>Running…</AlertTitle>
        <AlertDescription>Executing the compiled circuit locally.</AlertDescription>
      </Alert>
    );
  }
  if (result.status === "proven") {
    return (
      <Alert className="border-[#5cffb1] bg-[#f2fff8]">
        <AlertTitle className="text-[#161658]">Eligibility proven</AlertTitle>
        <AlertDescription className="space-y-1 text-[#232265]">
          <p>
            The circuit accepted the proof: eligible. Ledger after run — proven: {result.proven},
            nullifiers spent: {result.spent}, referrals: {result.referrals}.
          </p>
          <p>
            <Badge className="bg-[#b1a6f6] text-[#161658] hover:bg-[#b1a6f6]">{DISCLAIMER}</Badge>
          </p>
          <p className="text-xs text-[#3b38b7]">
            This executed the real compiled circuit in your browser&apos;s simulator — it touched no chain.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className="border-red-300 bg-red-50">
      <AlertTitle className="text-red-900">Proof rejected</AlertTitle>
      <AlertDescription className="space-y-1 text-red-800">
        <p className="font-mono text-xs break-words">{result.message}</p>
        <p>
          <Badge variant="outline" className="border-red-300 text-red-800">{DISCLAIMER}</Badge>
        </p>
      </AlertDescription>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Tier 2 — wallet + truth gate
// ---------------------------------------------------------------------------

function TierTwoCard() {
  const [wallet, setWallet] = useState<{ id: string; connectedVia: string } | null>(null);
  const [geroNote, setGeroNote] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [trials, setTrials] = useState<TrialOption[]>([]);
  const [trialId, setTrialId] = useState("");
  const [age, setAge] = useState("31");
  const [condition, setCondition] = useState(true);
  const [medication, setMedication] = useState(false);
  const [res, setRes] = useState<WalletResult>({ stage: "idle" });
  const [stageNote, setStageNote] = useState<string | null>(null);
  const walletRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/trials");
        if (!r.ok) throw new Error(`/api/trials -> ${r.status}`);
        const body = await r.json();
        const list: TrialOption[] = (body.trials || []).map((t: TrialOption) => ({
          trialId: t.trialId,
          title: t.title,
          minAge: t.minAge,
          maxAge: t.maxAge,
          requireCondition: t.requireCondition,
          forbidMedication: t.forbidMedication,
        }));
        if (!cancelled && list.length) {
          setTrials(list);
          setTrialId(list[0].trialId);
        }
      } catch {
        if (!cancelled) setTrials([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setRes({ stage: "connecting" });
    setConnectError(null);
    try {
      const runner = await import("@/lib/demo-runner.mjs");
      const w = await runner.connectDemoWallet({ preferred: "gero", networkId: "preprod" });
      walletRef.current = w;
      setWallet({ id: w.id, connectedVia: w.connectedVia });
      if (w.connectedVia === "gero") {
        const wmod = await import(/* webpackIgnore: true */ "/dapp/cohort-dapp.js");
        setGeroNote(runner.geroTrustNote(wmod));
      } else {
        setGeroNote(null);
      }
      setRes({ stage: "ready" });
    } catch (err) {
      setRes({ stage: "idle" });
      setConnectError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const submit = useCallback(async () => {
    const w = walletRef.current;
    if (!w || !trialId) return;
    setRes({ stage: "submitting" });
    setStageNote(null);
    try {
      const runner = await import("@/lib/demo-runner.mjs");
      const out = await runner.submitWalletProof({
        facts: { age: Number(age), condition, medication },
        trialId,
        wallet: w,
        networkId: "preprod",
        origin: window.location.origin,
        onStage: (s: string) => setStageNote(s),
      });
      const txId: string | null = out.txId ?? null;
      const txHash: string | null = out.txHash ?? null;
      const contractAddress: string | undefined = out.claims?.contractAddress;
      if (!contractAddress) throw new Error("prove.mjs returned no contract address — refusing to gate on an unknown contract.");
      setRes({ stage: "submitted", txHash, txId, note: "submitted — waiting for on-chain confirmation…" });
      // TRUTH GATE (C1): the page may only show success after the branded,
      // ledger-observed confirmation. waitForLedgerEffect throws unless the
      // contract's proven counter strictly rose above the pre-submit baseline.
      const gate = await runner.waitForLedgerEffect({ txId: txId ?? txHash, contractAddress });
      setRes({
        stage: "confirmed",
        txHash,
        observedAtBlock: gate.observedAtBlock ?? null,
        baselineProven: gate.baselineProven,
        attempts: gate.attempts,
        source: gate.source,
      });
    } catch (err) {
      const partial = res.stage === "submitted" ? res : null;
      setRes({ stage: "failed", message: err instanceof Error ? err.message : String(err), txHash: partial?.txHash ?? null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, trialId, age, condition, medication]);

  const busy = res.stage === "connecting" || res.stage === "submitting" || res.stage === "submitted";

  return (
    <Card className="border-[#3f3ccd] bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">Tier 2 — Prove with wallet</CardTitle>
          <Badge className="bg-[#3f3ccd] text-white hover:bg-[#3f3ccd]">on-chain</Badge>
        </div>
        <CardDescription className="text-[#3b38b7]">
          Same proveEligible circuit, real zero-knowledge proof, submitted to Preprod. Success appears only
          after the truth gate confirms the ledger effect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!wallet ? (
          <div className="space-y-2">
            <Button onClick={connect} disabled={busy} className="w-full bg-[#3f3ccd] hover:bg-[#3b38b7]">
              {res.stage === "connecting" ? "Connecting…" : "Connect wallet (GeroWallet, 1AM fallback)"}
            </Button>
            {connectError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTitle className="text-red-900">Wallet connection failed</AlertTitle>
                <AlertDescription className="font-mono text-xs text-red-800 break-words">{connectError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-[#3b38b7]">
              Detection is imported from packages/dapp/src/wallets.mjs — GeroWallet primary, 1AM fallback.
              Nothing is submitted until you press “Build &amp; submit proof”.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-[#5cffb1] bg-[#f2fff8]">
              <AlertTitle className="text-[#161658]">Wallet connected</AlertTitle>
              <AlertDescription className="text-[#232265] text-sm">
                Connected via <span className="font-medium">{wallet.connectedVia}</span> on Preprod.
                {geroNote && <span className="mt-1 block text-xs text-[#3b38b7]">{geroNote}</span>}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="t2-trial">Trial (from /api/trials)</Label>
              {trials.length ? (
                <select
                  id="t2-trial"
                  className="w-full rounded-md border border-[#b1a6f6] bg-white px-3 py-2 text-sm"
                  value={trialId}
                  onChange={(e) => setTrialId(e.target.value)}
                  disabled={busy}
                >
                  {trials.map((t) => (
                    <option key={t.trialId} value={t.trialId}>
                      {t.trialId} — {t.title.slice(0, 60)}
                    </option>
                  ))}
                </select>
              ) : (
                <Input id="t2-trial" placeholder="Trial ID (e.g. NCT…)" value={trialId} onChange={(e) => setTrialId(e.target.value)} disabled={busy} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t2-age">Age</Label>
                <Input id="t2-age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} disabled={busy} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={condition} onCheckedChange={(v) => setCondition(v === true)} disabled={busy} />
                Has required condition
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={medication} onCheckedChange={(v) => setMedication(v === true)} disabled={busy} />
                Takes excluded medication
              </label>
            </div>
            <Button onClick={submit} disabled={busy || !trialId} className="w-full bg-[#3f3ccd] hover:bg-[#3b38b7]">
              {res.stage === "submitting" ? "Proving & submitting…" : "Build & submit proof"}
            </Button>
            {stageNote && <p className="text-xs text-[#3b38b7]">prove.mjs stage: {stageNote}</p>}

            <WalletResultPanel res={res} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WalletResultPanel({ res }: { res: WalletResult }) {
  if (res.stage === "idle" || res.stage === "connecting" || res.stage === "ready" || res.stage === "submitting") {
    if (res.stage === "submitting") {
      return (
        <Alert className="border-[#6a67e6] bg-[#f4f4fb]">
          <AlertTitle>Proving…</AlertTitle>
          <AlertDescription>Building the zero-knowledge proof in your wallet and submitting it.</AlertDescription>
        </Alert>
      );
    }
    return null;
  }
  if (res.stage === "submitted") {
    return (
      <Alert className="border-[#6a67e6] bg-[#f4f4fb]">
        <AlertTitle className="text-[#232265]">Submitted — waiting for on-chain confirmation…</AlertTitle>
        <AlertDescription className="space-y-1 text-[#3b38b7]">
          <p>
            The transaction is in flight. <span className="font-medium">This is not a success yet</span> — the
            success screen appears only after the truth gate sees the ledger effect.
          </p>
          {(res.txHash || res.txId) && (
            <p className="font-mono text-xs break-all">tx: {res.txHash ?? res.txId}</p>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (res.stage === "confirmed") {
    return (
      <Alert className="border-[#5cffb1] bg-[#f2fff8]">
        <AlertTitle className="text-[#161658]">Confirmed on-chain</AlertTitle>
        <AlertDescription className="space-y-1 text-[#232265]">
          <p>
            The truth gate confirmed the ledger effect: the contract&apos;s <span className="font-medium">proven</span>{" "}
            counter rose strictly above its pre-submit baseline of{" "}
            <span className="font-medium">{res.baselineProven}</span>
            {res.observedAtBlock != null && <> (observed at block {res.observedAtBlock})</>}, after{" "}
            {res.attempts} poll rounds.
          </p>
          {res.txHash && <p className="font-mono text-xs break-all">tx: {res.txHash}</p>}
          <p className="text-xs text-[#3b38b7]">
            Verified by {res.source === "truth-gate.mjs" ? "C1's truth gate (branded, ledger-observed result)" : res.source} —
            not by the wallet&apos;s “submitted” message. A timed-out or unconfirmed submission can never
            reach this screen.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className="border-red-300 bg-red-50">
      <AlertTitle className="text-red-900">Proof flow failed</AlertTitle>
      <AlertDescription className="space-y-1 text-red-800">
        <p className="font-mono text-xs break-words">{res.message}</p>
        {res.txHash && <p className="font-mono text-xs break-all">tx (may still confirm later): {res.txHash}</p>}
        <p className="text-xs">No success is claimed — the truth gate did not confirm a ledger effect.</p>
      </AlertDescription>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Seam notes
// ---------------------------------------------------------------------------

function SeamNotes() {
  return (
    <footer className="mt-10 space-y-3 text-xs leading-relaxed text-[#3b38b7]">
      <Separator />
      <p className="font-medium text-[#232265]">Integration seams (for the squad, shown openly)</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <span className="font-medium">Shared circuit path:</span> both tiers run through
          <span className="font-mono"> web/src/lib/demo-runner.mjs</span>, which loads the compiled contract
          from <span className="font-mono">packages/contract/managed</span> and executes circuits with the
          same witness/boot code as <span className="font-mono">TESTS/circuit-lib.mjs</span>.
        </li>
        <li>
          <span className="font-medium">proveAttested gate:</span> locked as “attested path not live yet”. The
          demo-issuer ceremony has run (ISSUER_ID pinned in{" "}
          <span className="font-mono">CONTRACT/cohort.compact</span>, judge credentials issued), but this
          browser bundle was compiled before the pin — the page probes the live build on load and the button
          unlocks automatically once a rebuilt bundle (non-zero issuerId) ships. The attested circuits are
          also not deployed on-chain yet, so there is no on-chain attestation to verify against.
        </li>
        <li>
          <span className="font-medium">Truth gate:</span>{" "}
          <span className="font-mono">packages/dapp/src/truth-gate.mjs</span> (C1, landed) is wired in: Tier 2
          success renders only after its <span className="font-mono">waitForLedgerEffect</span> observes the
          proven counter strictly above the pre-submit baseline and{" "}
          <span className="font-mono">assertClaimedSuccess</span> accepts the branded result. demo-runner keeps
          a local polling fallback with identical semantics for environments where the module is absent.
        </li>
        <li>
          <span className="font-medium">Issuer issuance UI:</span> not on this page —{" "}
          <span className="font-mono">packages/dapp/src/attest.mjs</span> (B7) owns issuance. This page never
          mints attestations, and the proveAttested demo stays gated until the issuer ceremony runs.
        </li>
        <li>
          <Link href="/" className="text-[#3f3ccd] underline">← Back to COHORT</Link>
        </li>
      </ul>
    </footer>
  );
}
