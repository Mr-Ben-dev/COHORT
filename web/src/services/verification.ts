"use client";

import type { EligibilityCheck, PublicVerificationRecord } from "@/domain/types";
import { COHORT_API_ORIGIN, MIDNIGHT_NETWORK } from "@/lib/cohort-origin";
import { loadCohortDapp } from "@/lib/cohort-dapp";

export interface VerificationService {
  getPublicRecord(check: EligibilityCheck, trialTitle: string): PublicVerificationRecord;
  readIndexer(): Promise<{ proven?: number; spentCount?: number; referralCount?: number; source?: string }>;
}

class IndexerVerificationService implements VerificationService {
  getPublicRecord(
    check: EligibilityCheck,
    trialTitle: string,
  ): PublicVerificationRecord {
    const verified = check.proof.status === "verified" && Boolean(check.proof.txHash || check.proof.txId);
    const events: PublicVerificationRecord["events"] = [];
    if (verified) {
      events.push({
        kind: "proof-verified",
        label: "Eligibility proof confirmed on Midnight Preprod",
        timestamp: check.proof.verifiedAt,
      });
    }
    if (check.referral?.status === "sealed") {
      events.push({
        kind: "referral-sealed",
        label: "Public referral recorded",
        timestamp: check.referral.sealedAt || check.proof.verifiedAt,
      });
    }

    return {
      trialId: check.trialId,
      trialTitle,
      proof: {
        exists: verified,
        verified,
        publicRef: check.proof.publicRef,
        nullifier: check.proof.nullifier,
        verifiedAt: check.proof.verifiedAt,
      },
      referral: {
        commitment: check.referral?.status === "sealed",
        publicRef: check.referral?.publicRef,
        sealedAt: check.referral?.sealedAt,
        claimStatus: check.referral?.claimStatus,
      },
      events,
      notIncluded: [
        "Age",
        "Diagnosis",
        "Medications",
        "Lab values",
        "FHIR records",
        "Any raw medical data",
      ],
    };
  }

  async readIndexer() {
    const { CohortDapp } = await loadCohortDapp();
    return CohortDapp.getPublicVerification({
      origin: COHORT_API_ORIGIN,
      networkId: MIDNIGHT_NETWORK,
    });
  }
}

export const verificationService: VerificationService = new IndexerVerificationService();
