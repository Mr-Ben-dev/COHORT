import type { EligibilityCheck, Trial } from "@/domain/types";
import { MIDNIGHT_NETWORK } from "@/lib/cohort-origin";

/**
 * Public-safe qualification packet. Never include private health facts
 * or proving secrets.
 */
export function publicQualificationPacket(trial: Trial, check: EligibilityCheck): string {
  const proof = check.proof;
  const network =
    proof.network || (MIDNIGHT_NETWORK === "preprod" ? "Midnight Preprod" : MIDNIGHT_NETWORK);
  const proofId = proof.txHash || proof.txId || proof.publicRef;
  return [
    "COHORT public qualification",
    `Trial: ${trial.id}`,
    `Network: ${network}`,
    `Proof: ${proofId}`,
    "Status: verified eligibility (typed criteria only)",
    "Facts: not included",
  ].join("\n");
}

export async function copyPublicQualification(
  trial: Trial,
  check: EligibilityCheck,
): Promise<boolean> {
  const text = publicQualificationPacket(trial, check);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function officialStudyUrl(trial: Trial): string {
  return trial.studyUrl || `https://clinicaltrials.gov/study/${trial.id}`;
}
