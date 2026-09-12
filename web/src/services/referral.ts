"use client";

import type { ReferralRecord, Trial } from "@/domain/types";
import { COHORT_API_ORIGIN, COHORT_CONTRACT_ADDRESS, MIDNIGHT_NETWORK } from "@/lib/cohort-origin";
import { loadCohortDapp } from "@/lib/cohort-dapp";

export interface ReferralService {
  requestReferral(trial: Trial, txHash?: string | null): Promise<ReferralRecord>;
}

class PublicReferralService implements ReferralService {
  async requestReferral(trial: Trial, txHash?: string | null): Promise<ReferralRecord> {
    if (!txHash) {
      throw Object.assign(new Error("No confirmed transaction to refer."), {
        code: "TX_UNCONFIRMED",
        publicMessage: "Referral waits for a confirmed on-chain proof. Nothing was sealed.",
      });
    }
    const res = await fetch(`${COHORT_API_ORIGIN}/api/referral`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trialId: trial.id,
        txHash,
        contractAddress: COHORT_CONTRACT_ADDRESS,
        networkId: MIDNIGHT_NETWORK,
      }),
    });
    if (!res.ok && res.status !== 201 && res.status !== 200) {
      throw Object.assign(new Error("Public referral cache rejected the request."), {
        code: "TX_UNCONFIRMED",
        publicMessage: "The public referral record could not be stored. On-chain state is still the source of truth.",
      });
    }

    const { CohortDapp } = await loadCohortDapp();
    const verification = await CohortDapp.getPublicVerification({
      origin: COHORT_API_ORIGIN,
      networkId: MIDNIGHT_NETWORK,
    });
    const sealed = typeof verification?.referralCount === "number" && verification.referralCount > 0;
    if (!sealed) {
      return {
        status: "requested",
        siteName: trial.sponsor,
        bounty: trial.bounty,
        publicRef: txHash,
        claimStatus: "unclaimed",
      };
    }
    return {
      status: "sealed",
      siteName: trial.sponsor,
      bounty: trial.bounty,
      publicRef: txHash,
      sealedAt: new Date().toISOString(),
      claimStatus: "unclaimed",
    };
  }
}

export const referralService: ReferralService = new PublicReferralService();
