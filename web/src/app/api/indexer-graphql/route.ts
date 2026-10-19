import { NextResponse } from "next/server";
import { proxyCohort } from "@/lib/proxy-cohort";

/**
 * Same-origin proxy for the API's narrow indexer GraphQL passthrough
 * (POST /api/indexer-graphql on the Render API).
 *
 * Why this exists: the browser truth gate (packages/dapp/src/truth-gate.mjs)
 * polls the indexer's contractAction query to confirm a submitted proof's
 * ledger effect, but the browser bundle must never hold BLOCKFROST_PROJECT_ID.
 * This route forwards the gate's { query, variables } POST to the API, which
 * attaches the token server-side. The API only forwards contractAction reads;
 * arbitrary GraphQL is rejected there.
 *
 * Privacy: the request carries only a contract address and the fixed
 * contractAction query — no wallet keys, no health facts, no private fields.
 */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 16384) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const res = await proxyCohort("/api/indexer-graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({ error: "unavailable" }));
  return NextResponse.json(out, {
    status: res.status,
    headers: { "Cache-Control": "no-store" },
  });
}
