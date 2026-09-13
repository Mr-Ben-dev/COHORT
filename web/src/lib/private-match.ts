import type {
  MatchKind,
  PotentialMatch,
  PrivateEligibilityInput,
  PrivateProfile,
  Trial,
} from "@/domain/types";

export function isProfileReady(profile: PrivateProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    typeof profile.age === "number" &&
    Number.isFinite(profile.age) &&
    typeof profile.hasCondition === "boolean" &&
    (profile.medication === "yes" || profile.medication === "no")
  );
}

export function inputFromProfile(profile: PrivateProfile): PrivateEligibilityInput {
  return {
    age: profile.age,
    hasCondition: profile.hasCondition,
    medication: profile.medication,
    clinicalValue: profile.typedSubsetAck ? true : undefined,
  };
}

/**
 * Local typed-subset compatibility. Not a proof.
 * Reasons name public trial rules only. They never include the user's facts.
 */
export function matchTrial(
  profile: PrivateProfile | null | undefined,
  trial: Trial,
  verifiedTrialIds: ReadonlySet<string> = new Set(),
): PotentialMatch {
  if (verifiedTrialIds.has(trial.id)) {
    return {
      kind: "verified",
      reasons: [
        "Eligibility verified on Midnight Preprod for the supported typed criteria.",
      ],
    };
  }

  if (!isProfileReady(profile)) {
    return {
      kind: "unknown",
      reasons: ["Add your private facts on this device to see potential matches."],
    };
  }

  const min = trial.official?.minAge ?? trial.policy.ageMin;
  const max = trial.official?.maxAge ?? trial.policy.ageMax;
  const requireCondition = trial.official?.requireCondition ?? true;
  const forbidMedication = trial.official?.forbidMedication ?? true;

  const ageOk = profile!.age! >= min && profile!.age! <= max;
  const conditionOk = !requireCondition || profile!.hasCondition === true;
  const medicationOk = !forbidMedication || profile!.medication === "no";

  const reasons: string[] = [];
  if (ageOk) reasons.push("Age range matches the public typed bounds.");
  else reasons.push("Age range does not match the public typed bounds.");

  if (requireCondition) {
    reasons.push(
      conditionOk
        ? "Condition flag appears compatible with this study."
        : "Condition flag does not appear compatible with this study.",
    );
  } else {
    reasons.push("This typed subset does not require the mapped condition flag.");
  }

  if (forbidMedication) {
    reasons.push(
      medicationOk
        ? "No detected conflict with the excluded medication flag."
        : "A medication conflict is flagged on the typed subset.",
    );
  } else {
    reasons.push("This typed subset does not forbid the mapped medication flag.");
  }

  const kind: MatchKind = ageOk && conditionOk && medicationOk ? "potential" : "none";
  return { kind, reasons };
}
