"use client";

import type { Trial } from "@/domain/types";
import { COHORT_API_ORIGIN } from "@/lib/cohort-origin";
import type { OfficialTrial } from "@/lib/cohort-dapp";
import { mapOfficialTrial } from "@/lib/map-trial";

export interface TrialService {
  listTrials(): Promise<Trial[]>;
  getTrial(id: string): Promise<Trial | undefined>;
  getOfficial(id: string): Promise<OfficialTrial | null>;
}

async function fetchOfficialTrials(): Promise<OfficialTrial[]> {
  const res = await fetch("/api/trials", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Public trial data is unavailable. COHORT will not use local fixtures.");
  }
  const body = (await res.json()) as { trials?: OfficialTrial[] } | OfficialTrial[];
  const list = Array.isArray(body) ? body : body.trials || [];
  if (!list.length) {
    throw new Error("Public trial data is empty. COHORT will not use local fixtures.");
  }
  return list;
}

class LiveTrialService implements TrialService {
  private cache: Trial[] | null = null;
  private official: OfficialTrial[] | null = null;

  async listTrials(): Promise<Trial[]> {
    this.official = await fetchOfficialTrials();
    this.cache = this.official.map(mapOfficialTrial);
    return [...this.cache];
  }

  async getTrial(id: string): Promise<Trial | undefined> {
    const trials = this.cache || (await this.listTrials());
    return trials.find((t) => t.id === id);
  }

  async getOfficial(id: string): Promise<OfficialTrial | null> {
    if (!this.official) await this.listTrials();
    return this.official?.find((t) => t.trialId === id) || null;
  }
}

export const trialService: TrialService = new LiveTrialService();
export { COHORT_API_ORIGIN };
