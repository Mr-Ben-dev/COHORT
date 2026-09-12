import type {
  CriterionOutcome,
  EligibilityPolicy,
  EligibilityResult,
  PrivateEligibilityInput,
} from "@/domain/types";

/**
 * Local typed-subset preview only. Not a proof.
 * Circuit facts are age / condition / medication. Clinical is an honesty ack.
 */
export interface EligibilityService {
  evaluate(input: PrivateEligibilityInput, policy: EligibilityPolicy): EligibilityResult;
}

function isComplete(input: PrivateEligibilityInput): boolean {
  return (
    typeof input.age === "number" &&
    typeof input.hasCondition === "boolean" &&
    typeof input.medication === "string" &&
    input.medication.length > 0 &&
    input.clinicalValue === true
  );
}

class LocalEligibilityService implements EligibilityService {
  evaluate(input: PrivateEligibilityInput, policy: EligibilityPolicy): EligibilityResult {
    if (!isComplete(input)) {
      throw new Error("Eligibility input incomplete — refusing to evaluate.");
    }

    const outcomes: CriterionOutcome[] = [];
    const { ageMin, ageMax, condition, medication, clinical } = policy;

    const ageOk = input.age! >= ageMin && input.age! <= ageMax;
    outcomes.push({
      criterionId: "age",
      label: `Ages ${ageMin}–${ageMax}`,
      satisfied: ageOk,
      hint: `This typed subset enrolls ages ${ageMin}–${ageMax}.`,
    });

    const conditionOk = input.hasCondition === true;
    outcomes.push({
      criterionId: "condition",
      label: `${condition.label}`,
      satisfied: conditionOk,
      hint: "This is the sponsor-mapped condition flag, not a certified diagnosis.",
    });

    const selected = medication.options.find((o) => o.id === input.medication);
    const medOk = selected?.satisfies === true;
    outcomes.push({
      criterionId: "medication",
      label: medication.question,
      satisfied: medOk,
      hint: selected
        ? medOk
          ? "Your mapped medication flag matches the typed subset."
          : "The typed subset does not allow this medication flag."
        : "Select a medication answer to evaluate this criterion.",
    });

    const ackOk = input.clinicalValue === true;
    outcomes.push({
      criterionId: "clinical",
      label: clinical.publicLabel,
      satisfied: ackOk,
      hint: "The proof covers the supported typed criteria only. Free-text eligibility is not proven.",
    });

    const circuitOk = ageOk && conditionOk && medOk;
    return {
      eligible: circuitOk && ackOk,
      outcomes,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const eligibilityService: EligibilityService = new LocalEligibilityService();
