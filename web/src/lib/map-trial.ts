import type { Trial } from "@/domain/types";
import type { OfficialTrial } from "@/lib/cohort-dapp";
import { formatAgeRange } from "@/lib/format-age";

/**
 * Maps the live /api/trials typed subset onto the visual Trial contract.
 * Does not invent NCT records, phases, or bounties.
 */
export function mapOfficialTrial(t: OfficialTrial): Trial {
  const conditionLabel = t.conditionLabel || "Mapped condition flag";
  const medLabel = t.medicationLabel || "excluded medication flag";
  const loc = t.location;
  return {
    id: t.trialId,
    title: t.title,
    category: "Clinical research",
    condition: conditionLabel,
    summary:
      t.summary ||
      `${t.unsupportedCriteria || t.mapping || "Typed subset only."} The proof covers the supported typed criteria only.`,
    phase: (t.phase as Trial["phase"]) || "See study record",
    status: "recruiting",
    sponsor: t.sponsor || "ClinicalTrials.gov record",
    locations: loc
      ? [
          {
            city: loc.city || "See study",
            region: loc.region || "",
            country: loc.country || "",
            remote: Boolean(loc.remote),
          },
        ]
      : [],
    enrollmentTarget: 0,
    durationLabel: "See study record",
    checkMinutes: 3,
    bounty: 0,
    policy: {
      ageMin: t.minAge,
      ageMax: t.maxAge,
      condition: {
        code: "typed-condition",
        label: conditionLabel,
        question: `Is this present: ${conditionLabel}?`,
      },
      medication: {
        question: t.forbidMedication
          ? `Are you taking ${medLabel}?`
          : "Are you taking a medication this typed subset forbids?",
        options: [
          {
            id: "no",
            label: "No",
            satisfies: t.forbidMedication ? true : true,
          },
          {
            id: "yes",
            label: "Yes",
            satisfies: t.forbidMedication ? false : true,
          },
        ],
      },
      clinical: {
        question:
          "The proof covers the supported typed criteria only (age bounds and mapped flags). Free-text eligibility is not proven.",
        kind: "boolean",
        match: "min",
        publicLabel: "Typed subset only, not free-text eligibility",
        hint: "This is not a lab value. Confirm you understand the circuit does not prove free-text criteria.",
      },
    },
    criteriaHighlights: [
      { id: "age", label: formatAgeRange(t.minAge, t.maxAge), kind: "age" },
      { id: "condition", label: conditionLabel, kind: "condition" },
      {
        id: "medication",
        label: t.forbidMedication ? medLabel : "Medication flag not required",
        kind: "medication",
      },
      {
        id: "clinical",
        label: "Typed subset only (not free-text)",
        kind: "clinical",
      },
    ],
    studyUrl: t.source || `https://clinicaltrials.gov/study/${t.trialId}`,
    official: {
      trialId: t.trialId,
      minAge: t.minAge,
      maxAge: t.maxAge,
      requireCondition: t.requireCondition,
      forbidMedication: t.forbidMedication,
    },
  };
}

export function factsFromInput(input: {
  age?: number;
  hasCondition?: boolean;
  medication?: string;
}): { age: number; condition: boolean; medication: boolean } | null {
  if (typeof input.age !== "number" || typeof input.hasCondition !== "boolean") {
    return null;
  }
  if (typeof input.medication !== "string" || !input.medication) return null;
  return {
    age: input.age,
    condition: input.hasCondition,
    medication: input.medication === "yes",
  };
}
