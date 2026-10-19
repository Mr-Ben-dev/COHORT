import { NextResponse } from "next/server";
import { proxyCohort } from "@/lib/proxy-cohort";

/**
 * Same-origin proxy for the API's live ledger counters (A7).
 * Lets the no-wallet verification console and site console read
 * /api/public-state without a wallet and without CORS.
 */
export async function GET() {
  const res = await proxyCohort("/api/public-state");
  const body = await res.json().catch(() => ({ error: "unavailable" }));
  return NextResponse.json(body, {
    status: res.status,
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
