"use client";

import { create } from "zustand";
import type {
  EligibilityCheck,
  PrivateEligibilityInput,
  PrivateProfile,
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
import { inputFromProfile, isProfileReady } from "@/lib/private-match";
import { humanError } from "@/lib/human-error";
import { preloadCohortDapp } from "@/lib/cohort-dapp";
import {
  clearPrivateVault,
  loadPrivateProfile,
  loadPublicProofs,
  savePrivateProfile,
  savePublicProofs,
  type PublicProofCacheEntry,
} from "@/lib/private-vault";
import { discoverWallets } from "@/lib/wallet-discovery";
import { readPreferredRdns } from "@/lib/wallet-preference";
import { pollConnectionOrNull } from "@/services/wallet";

export type View =
  | { name: "home" }
  | { name: "trials" }
  | { name: "trial"; trialId: string }
  | { name: "check"; trialId: string }
  | { name: "proving"; trialId: string }
  | { name: "result"; checkId: string }
  | { name: "referral"; checkId: string }
  | { name: "verification"; checkId: string }
  | { name: "proofs" }
  | { name: "profile" };

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
  profile: PrivateProfile;

  inputs: Record<string, PrivateEligibilityInput>;
  checks: Record<string, EligibilityCheck>;
  activeProving: ActiveProving | null;
  pendingEligible: { trialId: string; checkPreview: EligibilityCheck["result"] } | null;

  navigate: (view: View, opts?: { scroll?: string }) => void;
  goBack: () => void;
  ensureTrials: () => Promise<void>;
  setDiscovery: (partial: Partial<DiscoveryState>) => void;
  setProfile: (partial: Partial<PrivateProfile>) => void;
  clearProfile: () => Promise<void>;
  hydrateLocalState: () => Promise<void>;
  refreshWalletPresence: () => void;
  applyProfileToTrial: (trialId: string) => void;
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
let persistTimer: number | null = null;

function queueProfilePersist(profile: PrivateProfile) {
  if (typeof window === "undefined") return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void savePrivateProfile(profile).catch(() => {});
  }, 250);
}

function publicProofsFromChecks(checks: Record<string, EligibilityCheck>): PublicProofCacheEntry[] {
  return Object.values(checks)
    .filter((c) => c.proof.status === "verified" && (c.proof.txHash || c.proof.txId))
    .map((c) => ({
      trialId: c.trialId,
      txHash: c.proof.txHash,
      txId: c.proof.txId,
      publicRef: c.proof.publicRef,
      verifiedAt: c.proof.verifiedAt,
      network: c.proof.network,
      referralStatus: c.referral
        ? ("sealed" === c.referral.status ? "shared" : "commitment")
        : "commitment",
    }));
}

function checksFromPublicProofs(rows: PublicProofCacheEntry[]): Record<string, EligibilityCheck> {
  const checks: Record<string, EligibilityCheck> = {};
  for (const row of rows) {
    const id = `pub_${row.trialId}_${(row.txHash || row.txId || row.publicRef).slice(0, 12)}`;
    checks[id] = {
      id,
      trialId: row.trialId,
      input: {},
      result: { eligible: true, outcomes: [], evaluatedAt: row.verifiedAt },
      proof: {
        publicRef: row.publicRef,
        fullRef: row.txId || row.txHash || row.publicRef,
        nullifier: "On-chain uniqueness token (not a medical fact)",
        status: "verified",
        verifiedAt: row.verifiedAt,
        network: row.network,
        txId: row.txId,
        txHash: row.txHash,
      },
      referral:
        row.referralStatus === "shared"
          ? {
              status: "sealed",
              siteName: "Study site",
              bounty: 0,
              publicRef: row.txHash || row.publicRef,
              claimStatus: "unclaimed",
            }
          : null,
      createdAt: row.verifiedAt,
    };
  }
  return checks;
}

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
  profile: {},

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
      const { profile } = get();
      const seeded = isProfileReady(profile) ? inputFromProfile(profile) : null;
      const inputs = { ...get().inputs };
      if (seeded) {
        for (const trial of trials) {
          inputs[trial.id] = { ...seeded, ...inputs[trial.id] };
        }
      }
      set({ trials, trialsStatus: "ready", inputs });
    } catch {
      set({ trialsStatus: "error" });
    }
  },

  setDiscovery: (partial) =>
    set((state) => ({ discovery: { ...state.discovery, ...partial } })),

  setProfile: (partial) =>
    set((state) => {
      const profile = { ...state.profile, ...partial };
      const seeded = isProfileReady(profile) ? inputFromProfile(profile) : null;
      const inputs = { ...state.inputs };
      if (seeded) {
        for (const trial of state.trials) {
          inputs[trial.id] = { ...inputs[trial.id], ...seeded };
        }
      }
      queueProfilePersist(profile);
      return { profile, inputs };
    }),

  clearProfile: async () => {
    await clearPrivateVault();
    set({ profile: {}, inputs: {} });
  },

  hydrateLocalState: async () => {
    try {
      const [profile, publicProofs] = await Promise.all([
        loadPrivateProfile(),
        loadPublicProofs(),
      ]);
      const restored = publicProofs.length ? checksFromPublicProofs(publicProofs) : {};
      set((state) => ({
        profile: profile ?? state.profile,
        checks: { ...restored, ...state.checks },
      }));
    } catch {
      /* private mode / missing IndexedDB */
    }
    get().refreshWalletPresence();
  },

  refreshWalletPresence: () => {
    const status = get().wallet.status;
    if (status === "connected" || status === "connecting" || status === "approving") return;
    const wallets = discoverWallets();
    const preferred = readPreferredRdns();
    const match = preferred
      ? wallets.find((w) => w.rdns === preferred || w.injectKey === preferred)
      : wallets.find((w) => w.kind === "1AM") || wallets[0];
    if (!wallets.length) {
      set({
        wallet: preferred
          ? {
              status: "unavailable",
            }
          : { status: "disconnected" },
      });
      return;
    }
    if (preferred && match) {
      set({
        wallet: {
          status: "permission-required",
          provider: match.kind === "Lace" ? "Lace" : "1AM",
          rdns: match.rdns,
          label: `Reconnect ${match.name}`,
        },
      });
      return;
    }
    set({
      wallet: {
        status: "available",
        provider: match?.kind === "Lace" ? "Lace" : "1AM",
        rdns: match?.rdns,
        label: match ? `${match.name} available` : "Wallet available",
      },
    });
  },

  applyProfileToTrial: (trialId) =>
    set((state) => {
      if (!isProfileReady(state.profile)) return state;
      const seeded = inputFromProfile(state.profile);
      return {
        inputs: {
          ...state.inputs,
          [trialId]: { ...seeded, ...state.inputs[trialId] },
        },
      };
    }),

  setAnswer: (trialId, partial) =>
    set((state) => {
      const nextInput = { ...state.inputs[trialId], ...partial };
      const profile = { ...state.profile };
      if (typeof nextInput.age === "number") profile.age = nextInput.age;
      if (typeof nextInput.hasCondition === "boolean") {
        profile.hasCondition = nextInput.hasCondition;
      }
      if (nextInput.medication === "yes" || nextInput.medication === "no") {
        profile.medication = nextInput.medication;
      }
      if (nextInput.clinicalValue === true) profile.typedSubsetAck = true;
      queueProfilePersist(profile);
      return {
        inputs: { ...state.inputs, [trialId]: nextInput },
        profile,
      };
    }),

  connectWallet: async (provider) => {
    set({ wallet: { status: "connecting", provider } });
    try {
      const session = await walletService.connect(provider);
      set({ wallet: session });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      if (code === "WALLET_SUPERSEDED") return;
      if (code === "WALLET_WRONG_NETWORK") {
        set({
          wallet: {
            status: "wrong-network",
            provider,
            networkId: "unknown",
            label: "Wrong network",
          },
          activeProving: get().activeProving
            ? { ...get().activeProving!, error: humanError(err) }
            : get().activeProving,
        });
        return;
      }
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
    const wallet = get().wallet;
    if (wallet.status !== "connected") return;
    if (wallet.canProve === false) {
      set({
        activeProving: get().activeProving
          ? {
              ...get().activeProving!,
              error:
                "Lace connected. Proof support for this flow is unavailable in the current Lace environment.",
            }
          : get().activeProving,
      });
      return;
    }
    await get().approveWallet();
  },

  disconnectWallet: () => {
    const prev = get().wallet;
    const provider =
      "provider" in prev && prev.provider ? prev.provider : "1AM";
    walletService.disconnect();
    const preferred = readPreferredRdns();
    if (preferred) {
      set({
        wallet: {
          status: "permission-required",
          provider,
          rdns: preferred,
          label: "Reconnect wallet",
        },
      });
      return;
    }
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
          nullifier: "Not submitted. Local preview only.",
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
          error: "Connect a wallet first. COHORT will not create a fake wallet.",
        },
      });
      return;
    }
    if (state.wallet.canProve === false) {
      set({
        activeProving: {
          trialId: proving.trialId,
          stage: "wallet-approval",
          error:
            "Lace connected. Proof support for this flow is unavailable in the current Lace environment.",
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
      void savePublicProofs(publicProofsFromChecks(get().checks)).catch(() => {});
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
    walletService.abandonPendingConnect();
    walletService.disconnect();
    const trialId = get().activeProving?.trialId;
    const inputs = { ...get().inputs };
    if (trialId) delete inputs[trialId];
    set({
      activeProving: null,
      pendingEligible: null,
      inputs,
      view: { name: "trials" },
      wallet: { status: "disconnected" },
    });
    get().refreshWalletPresence();
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
      void savePublicProofs(publicProofsFromChecks(get().checks)).catch(() => {});
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
