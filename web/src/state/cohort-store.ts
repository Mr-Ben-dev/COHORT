"use client";

import { create } from "zustand";
import type {
  EligibilityCheck,
  PrivateEligibilityInput,
  ProofStage,
  Trial,
  WalletProvider,
  WalletState,
} from "@/domain/types";
import {
  eligibilityService,
  proofService,
  referralService,
  trialService,
  walletService,
} from "@/services";
import { factsFromInput } from "@/lib/map-trial";
import { humanError } from "@/lib/human-error";
import { preloadCohortDapp } from "@/lib/cohort-dapp";

export type View =
  | { name: "home" }
  | { name: "trials" }
  | { name: "trial"; trialId: string }
  | { name: "check"; trialId: string }
  | { name: "proving"; trialId: string }
  | { name: "result"; checkId: string }
  | { name: "referral"; checkId: string }
  | { name: "verification"; checkId: string }
  | { name: "proofs" };

export type TrialsStatus = "idle" | "loading" | "ready" | "error";

interface DiscoveryState {
  query: string;
  category: string;
}

interface ActiveProving {
  trialId: string;
  stage: ProofStage;
  error: string | null;
}

interface CohortState {
  view: View;
  history: View[];
  pendingScroll: string | null;

  trials: Trial[];
  trialsStatus: TrialsStatus;
  wallet: WalletState;
  discovery: DiscoveryState;

  inputs: Record<string, PrivateEligibilityInput>;
  checks: Record<string, EligibilityCheck>;
  activeProving: ActiveProving | null;
  pendingEligible: { trialId: string; checkPreview: EligibilityCheck["result"] } | null;

  navigate: (view: View, opts?: { scroll?: string }) => void;
  goBack: () => void;
  ensureTrials: () => Promise<void>;
  setDiscovery: (partial: Partial<DiscoveryState>) => void;
  setAnswer: (trialId: string, partial: Partial<PrivateEligibilityInput>) => void;
  connectWallet: (provider: WalletProvider) => Promise<void>;
  connectAndProve: (provider: WalletProvider) => Promise<void>;
  disconnectWallet: () => void;
  startCheck: (trial: Trial) => Promise<void>;
  approveWallet: () => Promise<void>;
  cancelProving: () => void;
  requestReferral: (checkId: string) => Promise<void>;
  getCheck: (checkId: string) => EligibilityCheck | undefined;
  getTrial: (trialId: string) => Trial | undefined;
}

let provingRunId = 0;
let proveInFlight = false;

function checkId(trialId: string): string {
  return `chk_${trialId.toLowerCase()}_${Date.now().toString(36)}`;
}

function shorten(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

const initialView: View = { name: "home" };

export const useCohortStore = create<CohortState>((set, get) => ({
  view: initialView,
  history: [],
  pendingScroll: null,

  trials: [],
  trialsStatus: "idle",
  wallet: { status: "disconnected" },
  discovery: { query: "", category: "All" },

  inputs: {},
  checks: {},
  activeProving: null,
  pendingEligible: null,

  navigate: (view, opts) =>
    set((state) => ({
      history: [...state.history, state.view],
      view,
      pendingScroll: opts?.scroll ?? null,
    })),

  goBack: () =>
    set((state) => {
      if (state.history.length === 0) return { view: { name: "home" } as View };
      const history = [...state.history];
      const view = history.pop()!;
      return { history, view, pendingScroll: null };
    }),

  ensureTrials: async () => {
    const { trialsStatus } = get();
    if (trialsStatus === "loading" || trialsStatus === "ready") return;
    set({ trialsStatus: "loading" });
    try {
      const trials = await trialService.listTrials();
      set({ trials, trialsStatus: "ready" });
    } catch {
      set({ trialsStatus: "error" });
    }
  },

  setDiscovery: (partial) =>
    set((state) => ({ discovery: { ...state.discovery, ...partial } })),

  setAnswer: (trialId, partial) =>
    set((state) => ({
      inputs: {
        ...state.inputs,
        [trialId]: { ...state.inputs[trialId], ...partial },
      },
    })),

  connectWallet: async (provider) => {
    set({ wallet: { status: "connecting", provider } });
    try {
      const session = await walletService.connect(provider);
      set({ wallet: session });
    } catch (err) {
      set({
        wallet: { status: "disconnected" },
        activeProving: get().activeProving
          ? { ...get().activeProving!, error: humanError(err) }
          : get().activeProving,
      });
    }
  },

  connectAndProve: async (provider) => {
    await get().connectWallet(provider);
    if (get().wallet.status !== "connected") return;
    await get().approveWallet();
  },

  disconnectWallet: () => {
    walletService.disconnect();
    set({ wallet: { status: "disconnected" } });
  },

  startCheck: async (trial) => {
    const state = get();
    const input = state.inputs[trial.id];
    if (!input) return;

    let result;
    try {
      result = eligibilityService.evaluate(input, trial.policy);
    } catch {
      return;
    }

    if (!result.eligible) {
      const id = checkId(trial.id);
      const at = new Date().toISOString();
      const newCheck: EligibilityCheck = {
        id,
        trialId: trial.id,
        input,
        result,
        proof: {
          publicRef: "none",
          fullRef: "none",
          nullifier: "Not submitted — local preview only",
          status: "ineligible",
          verifiedAt: at,
          network: "Midnight Preprod",
        },
        referral: null,
        createdAt: at,
      };
      const { [trial.id]: _dropped, ...rest } = state.inputs;
      set({
        checks: { ...state.checks, [id]: newCheck },
        inputs: rest,
        view: { name: "result", checkId: id },
        history: [...state.history, state.view],
      });
      return;
    }

    void preloadCohortDapp();
    set({
      pendingEligible: { trialId: trial.id, checkPreview: result },
      activeProving: { trialId: trial.id, stage: "wallet-approval", error: null },
      view: { name: "proving", trialId: trial.id },
      history: [...state.history, state.view],
    });
  },

  approveWallet: async () => {
    const state = get();
    const proving = state.activeProving;
    if (!proving) return;
    const trial = state.trials.find((t) => t.id === proving.trialId);
    const input = state.inputs[proving.trialId];
    const facts = input ? factsFromInput(input) : null;
    const api = walletService.getConnectedApi();
    if (!trial || !facts) {
      set({
        activeProving: {
          trialId: proving.trialId,
          stage: proving.stage,
          error: "Private answers are missing on this device. Start the check again.",
        },
      });
      return;
    }
    if (state.wallet.status !== "connected" || !api) {
      set({
        activeProving: {
          trialId: proving.trialId,
          stage: "wallet-approval",
          error: "Connect 1AM first. COHORT will not create a fake wallet.",
        },
      });
      return;
    }
    if (proveInFlight) return;
    const official = trial.official;
    if (!official) {
      set({
        activeProving: {
          trialId: proving.trialId,
          stage: proving.stage,
          error: "This study is missing official typed policy. COHORT will not invent circuit args.",
        },
      });
      return;
    }

    const runId = ++provingRunId;
    proveInFlight = true;
    set({
      activeProving: { trialId: proving.trialId, stage: "creating", error: null },
    });

    try {
      const proveResult = await proofService.prove({
        trial: {
          trialId: official.trialId,
          title: trial.title,
          minAge: official.minAge,
          maxAge: official.maxAge,
          requireCondition: official.requireCondition,
          forbidMedication: official.forbidMedication,
        },
        facts,
        walletApi: api,
        onStage: (stage) => {
          if (get().activeProving?.trialId !== proving.trialId) return;
          set({ activeProving: { trialId: proving.trialId, stage, error: null } });
        },
      });

      if (provingRunId !== runId) return;
      if (!proveResult.txId && !proveResult.txHash) {
        throw Object.assign(new Error("No transaction identifier."), {
          code: "TX_UNCONFIRMED",
        });
      }

      const id = checkId(trial.id);
      const verifiedAt = new Date().toISOString();
      const preview = state.pendingEligible?.checkPreview || eligibilityService.evaluate(input, trial.policy);
      const txHash = proveResult.txHash || "";
      const txId = proveResult.txId || "";
      const newCheck: EligibilityCheck = {
        id,
        trialId: trial.id,
        input,
        result: preview,
        proof: {
          publicRef: shorten(txHash || txId),
          fullRef: txId || txHash,
          nullifier: "On-chain uniqueness token (not a medical fact)",
          status: "verified",
          verifiedAt,
          network: "Midnight Preprod",
          txId: txId || undefined,
          txHash: txHash || undefined,
          proven: proveResult.proven ?? null,
        },
        referral: null,
        createdAt: verifiedAt,
      };
      const { [trial.id]: _cleared, ...restInputs } = get().inputs;
      set((s) => ({
        checks: { ...s.checks, [id]: newCheck },
        inputs: restInputs,
        pendingEligible: null,
        activeProving: null,
        view: { name: "result", checkId: id },
        history: [...s.history, s.view],
      }));
    } catch (err) {
      if (provingRunId !== runId) return;
      set({
        activeProving: {
          trialId: proving.trialId,
          stage: "creating",
          error: humanError(err),
        },
      });
    } finally {
      if (provingRunId === runId) proveInFlight = false;
    }
  },

  cancelProving: () => {
    provingRunId++;
    const trialId = get().activeProving?.trialId;
    const inputs = { ...get().inputs };
    if (trialId) delete inputs[trialId];
    set({
      activeProving: null,
      pendingEligible: null,
      inputs,
      view: { name: "trials" },
    });
  },

  requestReferral: async (checkId) => {
    const check = get().checks[checkId];
    const trial = get().trials.find((t) => t.id === check?.trialId);
    if (!check || !trial) return;
    if (check.proof.status !== "verified" || !check.proof.txHash) return;

    set((s) => ({
      checks: {
        ...s.checks,
        [checkId]: {
          ...check,
          referral: {
            status: "requested",
            siteName: trial.sponsor,
            bounty: trial.bounty,
            publicRef: check.proof.txHash || "",
            claimStatus: "unclaimed",
          },
        },
      },
      view: { name: "referral", checkId },
      history: [...s.history, s.view],
    }));

    try {
      const referral = await referralService.requestReferral(trial, check.proof.txHash);
      set((s) => {
        const current = s.checks[checkId];
        if (!current) return s;
        return {
          checks: {
            ...s.checks,
            [checkId]: { ...current, referral },
          },
        };
      });
    } catch {
      set((s) => {
        const current = s.checks[checkId];
        if (!current) return s;
        return {
          checks: {
            ...s.checks,
            [checkId]: {
              ...current,
              referral: {
                status: "requested",
                siteName: trial.sponsor,
                bounty: trial.bounty,
                publicRef: check.proof.txHash || "",
                claimStatus: "unclaimed",
              },
            },
          },
        };
      });
    }
  },

  getCheck: (checkId) => get().checks[checkId],

  getTrial: (trialId) => get().trials.find((t) => t.id === trialId),
}));

export function selectTrialForView(state: CohortState): Trial | undefined {
  const v = state.view;
  if (v.name === "trial" || v.name === "check" || v.name === "proving") {
    return state.trials.find((t) => t.id === v.trialId);
  }
  if (v.name === "result" || v.name === "referral" || v.name === "verification") {
    const check = state.checks[v.checkId];
    return state.trials.find((t) => t.id === check?.trialId);
  }
  return undefined;
}

export function selectCheckForView(state: CohortState): EligibilityCheck | undefined {
  const v = state.view;
  if (v.name === "result" || v.name === "referral" || v.name === "verification") {
    return state.checks[v.checkId];
  }
  return undefined;
}
