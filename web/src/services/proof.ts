"use client";

import type { ProofStage } from "@/domain/types";
import {
  COHORT_API_ORIGIN,
  COHORT_CONTRACT_ADDRESS,
  MIDNIGHT_INDEXER_URL,
  MIDNIGHT_INDEXER_WS_URL,
  MIDNIGHT_NETWORK,
} from "@/lib/cohort-origin";
import { loadCohortDapp, type OfficialTrial, type ProveResult } from "@/lib/cohort-dapp";
import type { ConnectedWalletApi } from "@/services/wallet";

export interface ProofLifecycleCallbacks {
  onStage: (stage: ProofStage) => void;
}

export interface ProveInput {
  trial: OfficialTrial;
  facts: { age: number; condition: boolean; medication: boolean };
  walletApi: ConnectedWalletApi;
  onStage: (stage: ProofStage) => void;
}

export interface ProofService {
  prove(input: ProveInput): Promise<ProveResult>;
}

function mapLifecycle(stage: string): ProofStage | null {
  switch (stage) {
    case "PREPARING":
      return "preparing";
    case "PROVING":
      return "creating";
    case "WAITING_FOR_WALLET":
      return "wallet-approval";
    case "SUBMITTING":
    case "CONFIRMING":
      return "submitting";
    case "CONFIRMED":
      return "confirmed";
    default:
      return null;
  }
}

/**
 * Same-origin read of the API's live proven counter (no wallet).
 * The API attaches the indexer token server-side; the browser never sees it.
 */
async function readLiveProven(): Promise<{ proven: number; live: boolean }> {
  const res = await fetch("/api/public-state", { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  const proven = typeof body?.proven === "number" ? body.proven : null;
  const live = body?.source === "live-onchain" && proven !== null;
  return { proven: proven ?? -1, live };
}

class CohortProofService implements ProofService {
  async prove(input: ProveInput): Promise<ProveResult> {
    const dappMod = await loadCohortDapp();
    const { CohortDapp } = dappMod;
    input.onStage("preparing");
    const result = await CohortDapp.proveEligibility({
      origin: COHORT_API_ORIGIN,
      networkId: MIDNIGHT_NETWORK,
      indexerUrl: MIDNIGHT_INDEXER_URL,
      indexerWsUrl: MIDNIGHT_INDEXER_WS_URL,
      contractAddress: COHORT_CONTRACT_ADDRESS,
      trial: input.trial,
      trialId: input.trial.trialId,
      facts: input.facts,
      wallet: { api: input.walletApi },
      postPublicReferral: true,
      onStage: (stage: string) => {
        const mapped = mapLifecycle(stage);
        // TRUTH GATE: the dapp emits CONFIRMED on wallet acceptance
        // (submission), which is NOT ledger confirmation. Suppress it here —
        // only the truth gate below may emit "confirmed".
        if (!mapped || mapped === "confirmed") return;
        input.onStage(mapped);
      },
    });
    const txId = result?.txId || result?.txHash || null;
    if (!txId) {
      throw Object.assign(new Error("submitCallTx returned no transaction identifier."), {
        code: "TX_UNCONFIRMED",
        publicMessage:
          "The network has not confirmed this transaction yet. COHORT will not mark it verified.",
      });
    }

    // TRUTH GATE (packages/dapp/src/truth-gate.mjs): success is reported
    // only after the proof's ledger effect is OBSERVED on chain — the
    // contract's proven counter strictly rising above the pre-submit
    // baseline read from the live API. Wallet acceptance alone never
    // confirms.
    const { waitForLedgerEffect, assertClaimedSuccess } = dappMod;
    if (
      typeof waitForLedgerEffect !== "function" ||
      typeof assertClaimedSuccess !== "function"
    ) {
      throw Object.assign(
        new Error("truth gate unavailable in the loaded dapp bundle — refusing to confirm."),
        { code: "TX_UNCONFIRMED" },
      );
    }
    const baseline = await readLiveProven();
    if (!baseline.live) {
      throw Object.assign(
        new Error(
          "could not read a live proven-counter baseline from /api/public-state — refusing to confirm without it.",
        ),
        { code: "TX_UNCONFIRMED" },
      );
    }
    const gateResult = await waitForLedgerEffect({
      contractAddress: COHORT_CONTRACT_ADDRESS,
      txHash: txId,
      // Same-origin GraphQL passthrough: the API attaches the indexer token
      // server-side (web/src/app/api/indexer-graphql/route.ts).
      indexerUrl: "/api/indexer-graphql",
      pollIntervalMs: 5000,
      timeoutMs: 180000,
      expectedPredicate: async () => {
        const cur = await readLiveProven();
        return cur.live && cur.proven > baseline.proven;
      },
    });
    assertClaimedSuccess(gateResult); // throws unless the ledger effect was observed

    input.onStage("confirmed");
    return { ...result, source: "truth-gated" };
  }
}

export const proofService: ProofService = new CohortProofService();
