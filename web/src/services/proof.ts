"use client";

import type { ProofStage } from "@/domain/types";
import {
  COHORT_API_ORIGIN,
  COHORT_CONTRACT_ADDRESS,
  MIDNIGHT_INDEXER_URL,
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

class CohortProofService implements ProofService {
  async prove(input: ProveInput): Promise<ProveResult> {
    const { CohortDapp } = await loadCohortDapp();
    input.onStage("preparing");
    const result = await CohortDapp.proveEligibility({
      origin: COHORT_API_ORIGIN,
      networkId: MIDNIGHT_NETWORK,
      indexerUrl: MIDNIGHT_INDEXER_URL,
      contractAddress: COHORT_CONTRACT_ADDRESS,
      trial: input.trial,
      trialId: input.trial.trialId,
      facts: input.facts,
      wallet: { api: input.walletApi },
      postPublicReferral: true,
      onStage: (stage: string) => {
        const mapped = mapLifecycle(stage);
        if (mapped) input.onStage(mapped);
      },
    });
    if (!result?.txId && !result?.txHash) {
      throw Object.assign(new Error("submitCallTx returned no transaction identifier."), {
        code: "TX_UNCONFIRMED",
        publicMessage:
          "The network has not confirmed this transaction yet. COHORT will not mark it verified.",
      });
    }
    input.onStage("confirmed");
    return result;
  }
}

export const proofService: ProofService = new CohortProofService();
