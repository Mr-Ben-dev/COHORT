/**
 * COHORT domain models.
 *
 * These types are the contract between the UI and CohortDapp / Render.
 * Private facts never leave the device. Public records contain no medical facts.
 *
 * PRIVACY BOUNDARY (security-critical, do not erode):
 *   - `PrivateEligibilityInput` and `EligibilityResult.outcomes` are PRIVATE,
 *     client-local only. They must never be sent to any API, service, or store
 *     outside this device.
 *   - `ProofRecord` / `ReferralRecord` / `PublicVerificationRecord` model the
 *     PUBLIC on-chain state — they intentionally contain no medical facts.
 */

/* ────────────────────────────────────────────────────────────
 * Trials (public data — ClinicalTrials.gov-shaped)
 * ──────────────────────────────────────────────────────────── */

export type RecruitingStatus =
  | "recruiting"
  | "not-yet-recruiting"
  | "active-not-recruiting";

export type TrialPhase = "Phase 1" | "Phase 2" | "Phase 3" | "See study record";

export interface TrialLocation {
  city: string;
  region: string;
  country: string;
  remote: boolean;
}

/** A single public eligibility rule, shown on cards + detail pages. */
export interface PublicCriterion {
  id: string;
  /** Human-readable, e.g. "Ages 18-65" */
  label: string;
  kind: "age" | "condition" | "medication" | "clinical" | "commitment";
}

/**
 * The machine-evaluable eligibility policy of a trial.
 * Mirrors the predicate the future Midnight circuit will prove.
 */
export interface EligibilityPolicy {
  ageMin: number;
  ageMax: number;
  condition: {
    /** e.g. "type-2-diabetes" */
    code: string;
    /** e.g. "Type 2 Diabetes" */
    label: string;
    /** Question shown in the private check, e.g. "Do you have a diagnosis of Type 2 Diabetes?" */
    question: string;
  };
  medication: {
    /** Question shown in the private check */
    question: string;
    options: MedicationOption[];
  };
  clinical: {
    /** Question shown in the private check */
    question: string;
    kind: "number" | "boolean";
    /**
     * How the number is matched:
     *  - "min"  → satisfied when value ≥ min   (e.g. HbA1c ≥ 7.5)
     *  - "max"  → satisfied when value ≤ max   (e.g. LVEF ≤ 40)
     *  - "band" → satisfied when min ≤ value ≤ max (e.g. MMSE 20–28)
     */
    match: "min" | "max" | "band";
    min?: number;
    max?: number;
    unit?: string;
    /** Helper text shown next to the input */
    hint?: string;
    /** How the requirement is summarized publicly */
    publicLabel: string;
  };
}

export interface MedicationOption {
  id: string;
  label: string;
  /** true when taking this option satisfies the medication criterion */
  satisfies: boolean;
}

export interface Trial {
  /** NCT-style identifier, e.g. "NCT06218473" */
  id: string;
  title: string;
  /** Therapeutic area, e.g. "Endocrinology" */
  category: string;
  condition: string;
  summary: string;
  phase: TrialPhase;
  status: RecruitingStatus;
  sponsor: string;
  locations: TrialLocation[];
  enrollmentTarget: number;
  durationLabel: string;
  /** Estimated minutes for the private eligibility check */
  checkMinutes: number;
  /** Unused on the live contract. Escrowed bounties are coming next, not shown as live. */
  bounty: number;
  policy: EligibilityPolicy;
  criteriaHighlights: PublicCriterion[];
  studyUrl: string;
  /** Official circuit args from /api/trials. Never user-edited. */
  official?: {
    trialId: string;
    minAge: number;
    maxAge: number;
    requireCondition: boolean;
    forbidMedication: boolean;
  };
}

/* ────────────────────────────────────────────────────────────
 * Private eligibility inputs (CLIENT-LOCAL — never transmitted)
 * ──────────────────────────────────────────────────────────── */

export interface PrivateEligibilityInput {
  age?: number;
  hasCondition?: boolean;
  /** MedicationOption.id */
  medication?: string;
  clinicalValue?: number | boolean;
}

/**
 * Durable private facts for repeat matching.
 * Encrypted IndexedDB on this origin only. Never POSTed, never in URLs/cookies.
 */
export interface PrivateProfile {
  age?: number;
  hasCondition?: boolean;
  /** "yes" | "no" mapped medication flag */
  medication?: "yes" | "no";
  /** User acknowledges the circuit does not prove free-text criteria. */
  typedSubsetAck?: boolean;
}

export type MatchKind = "unknown" | "none" | "potential" | "verified";

export interface PotentialMatch {
  kind: MatchKind;
  /** Local-only reasons. Never include the user's age or flags. */
  reasons: string[];
}

/* ────────────────────────────────────────────────────────────
 * Eligibility evaluation (computed locally on-device)
 * ──────────────────────────────────────────────────────────── */

export interface CriterionOutcome {
  criterionId: string;
  /** Public label of the criterion that was evaluated */
  label: string;
  satisfied: boolean;
  /** Gentle, private-only hint explaining the requirement */
  hint: string;
}

export interface EligibilityResult {
  eligible: boolean;
  outcomes: CriterionOutcome[];
  evaluatedAt: string;
}

/* ────────────────────────────────────────────────────────────
 * Proof lifecycle (maps to the future Midnight proving flow)
 * ──────────────────────────────────────────────────────────── */

/**
 * Proving stages. These intentionally map 1:1 onto the real lifecycle:
 *   preparing        → local witness preparation
 *   creating         → zero-knowledge proof generation
 *   wallet-approval  → 1AM / Lace approval screen
 *   submitting       → submitCallTx on Midnight
 *   confirmed        → indexer confirmation
 */
export type ProofStage =
  | "preparing"
  | "creating"
  | "wallet-approval"
  | "submitting"
  | "confirmed";

export const PROOF_STAGES: ProofStage[] = [
  "preparing",
  "creating",
  "wallet-approval",
  "submitting",
  "confirmed",
];

export const PROOF_STAGE_COPY: Record<
  ProofStage,
  { label: string; detail: string }
> = {
  preparing: {
    label: "Preparing private check",
    detail: "Reading the trial's public eligibility rules on your device.",
  },
  creating: {
    label: "Creating proof",
    detail: "Your facts stay local while the eligibility predicate is proven.",
  },
  "wallet-approval": {
    label: "Requesting wallet approval",
    detail: "You'll confirm once in your wallet. Nothing else is asked of you.",
  },
  submitting: {
    label: "Submitting verification",
    detail: "The proof — not your facts — is submitted for public verification.",
  },
  confirmed: {
    label: "Confirmed",
    detail: "Verification recorded. Your record never left your device.",
  },
};

/* ────────────────────────────────────────────────────────────
 * Wallet
 * ──────────────────────────────────────────────────────────── */

export type WalletProvider = "1AM" | "Lace";

export type WalletState =
  | { status: "disconnected" }
  | { status: "unavailable" }
  | {
      status: "available";
      provider?: WalletProvider;
      rdns?: string;
      label?: string;
    }
  | {
      status: "permission-required";
      provider: WalletProvider;
      rdns: string;
      label: string;
    }
  | { status: "connecting"; provider: WalletProvider }
  | { status: "reconnecting"; provider: WalletProvider; label: string }
  | {
      status: "wrong-network";
      provider: WalletProvider;
      networkId: string;
      label: string;
    }
  | {
      status: "connected";
      provider: WalletProvider;
      /** Short display handle for the connected session */
      label: string;
      dust?: "Ready" | "Needs DUST" | "Wallet syncing";
      networkId?: string;
      rdns?: string;
      canProve?: boolean;
    }
  | { status: "approving"; provider: WalletProvider; label: string };

/* ────────────────────────────────────────────────────────────
 * Public records (on-chain-shaped, contain NO medical facts)
 * ──────────────────────────────────────────────────────────── */

export interface ProofRecord {
  /** Public tx hash or honest placeholder when none exists */
  publicRef: string;
  /** Full tx id when submitCallTx returned one */
  fullRef: string;
  /** Honest public note — never a fabricated nullifier */
  nullifier: string;
  status: "verified" | "ineligible" | "failed";
  verifiedAt: string;
  /** Target network label (environment info only) */
  network: string;
  txId?: string;
  txHash?: string;
  proven?: number | null;
}

export interface ReferralRecord {
  status: "requested" | "sealed";
  siteName: string;
  bounty: number;
  publicRef: string;
  sealedAt?: string;
  claimStatus: "unclaimed" | "claimed";
}

/** A completed eligibility check, held together client-side. */
export interface EligibilityCheck {
  /** Local check id */
  id: string;
  trialId: string;
  /** PRIVATE — stays on device */
  input: PrivateEligibilityInput;
  /** PRIVATE — stays on device */
  result: EligibilityResult;
  /** PUBLIC record of the proof */
  proof: ProofRecord;
  referral: ReferralRecord | null;
  createdAt: string;
}

/* ────────────────────────────────────────────────────────────
 * Public verification view (what sites / sponsors can see)
 * ──────────────────────────────────────────────────────────── */

export interface PublicEvent {
  kind: "proof-verified" | "referral-sealed";
  label: string;
  timestamp: string;
}

export interface PublicVerificationRecord {
  trialId: string;
  trialTitle: string;
  proof: {
    exists: boolean;
    verified: boolean;
    publicRef: string;
    nullifier: string;
    verifiedAt: string;
  };
  referral: {
    commitment: boolean;
    publicRef?: string;
    sealedAt?: string;
    claimStatus?: string;
  };
  events: PublicEvent[];
  /** Explicitly listed so the UI can show what is NOT revealed */
  notIncluded: string[];
}
