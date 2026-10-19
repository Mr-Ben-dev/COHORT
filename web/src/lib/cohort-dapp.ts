"use client";

/**
 * Loads the already-built midnight-js 4.1.1 browser bundle.
 * Visual components must not import Midnight internals; they go through CohortDapp.
 */
let loading: Promise<CohortDappModule> | null = null;

export type TruthGateSnapshot = {
  contractAddress: string;
  actionTypename: string | null;
  stateHex: string | null;
  transactionHash: string | null;
  blockHeight: number | null;
  raw: unknown;
};

export type TruthGateResult = {
  confirmed: boolean;
  txHash: string | null;
  reason?: string;
  observedAtBlock?: number | null;
  attempts?: number;
};

export type CohortDappModule = {
  CohortDapp: {
    proveEligibility: (input: Record<string, unknown>) => Promise<ProveResult>;
    getPublicVerification: (opts?: Record<string, unknown>) => Promise<PublicVerification>;
    getTrials: (opts?: Record<string, unknown>) => Promise<OfficialTrial[]>;
    getTrial: (trialId: string, opts?: Record<string, unknown>) => Promise<OfficialTrial | null>;
    checkEligibility: (
      facts: { age: number; condition: boolean; medication: boolean },
      trial: OfficialTrial,
    ) => {
      kind: string;
      isProof: boolean;
      eligiblePreview: boolean;
      mapping?: string;
      unsupportedCriteria?: string;
    };
    claims: { contractAddress: string; doesNotProve: string[] };
  };
  ErrorCode?: Record<string, string>;
  /** Truth gate (packages/dapp/src/truth-gate.mjs) — re-exported by the bundle. */
  truthGatedCall?: (
    txPromise: Promise<unknown>,
    gateOpts?: Record<string, unknown>,
  ) => Promise<TruthGateResult>;
  waitForLedgerEffect?: (opts: {
    contractAddress: string;
    expectedPredicate: (
      snapshot: TruthGateSnapshot,
      ctx: { attempt: number; txHash: string | null },
    ) => boolean | Promise<boolean>;
    txHash?: string | null;
    pollIntervalMs?: number;
    timeoutMs?: number;
    indexerUrl?: string;
    fetch?: typeof fetch;
    onPoll?: (info: unknown) => void;
  }) => Promise<TruthGateResult>;
  assertClaimedSuccess?: (result: unknown) => TruthGateResult;
  isClaimedSuccess?: (result: unknown) => boolean;
};

export type OfficialTrial = {
  trialId: string;
  title: string;
  minAge: number;
  maxAge: number;
  requireCondition: boolean;
  forbidMedication: boolean;
  conditionLabel?: string;
  medicationLabel?: string | null;
  mapping?: string;
  unsupportedCriteria?: string;
  source?: string;
  sponsor?: string;
  phase?: string;
  summary?: string;
  location?: {
    city: string;
    region: string;
    country: string;
    remote: boolean;
  } | null;
  fetchedFrom?: string;
};

export type ProveResult = {
  lifecycle: string;
  txId?: string;
  txHash?: string;
  proven?: number | null;
  source?: string;
};

export type PublicVerification = {
  proven?: number;
  spentCount?: number;
  referralCount?: number;
  source?: string;
};

export function preloadCohortDapp(): Promise<CohortDappModule> {
  return loadCohortDapp();
}

export function loadCohortDapp(): Promise<CohortDappModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("CohortDapp only loads in the browser."));
  }
  if (!loading) {
    loading = import(
      /* webpackIgnore: true */
      "/dapp/cohort-dapp.js"
    ) as Promise<CohortDappModule>;
  }
  return loading;
}
