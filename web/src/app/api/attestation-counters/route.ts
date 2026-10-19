import { NextResponse } from "next/server";
import { proxyCohort } from "@/lib/proxy-cohort";

/**
 * Same-origin proxy for the API's attestation counters (A7/C4).
 * Returns null + labeled counters when the Wave-3 contract is undeployed.
 */
export async function GET() {
  const res = await proxyCohort("/api/attestation-counters");
  const body = await res.json().catch(() => ({ error: "unavailable" }));
  return NextResponse.json(body, {
    status: res.status,
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
