import { NextResponse } from "next/server";
import { findPrivateFields, proxyCohort } from "@/lib/proxy-cohort";

export async function GET() {
  const res = await proxyCohort("/api/config");
  const body = await res.json().catch(() => ({ error: "unavailable" }));
  return NextResponse.json(body, {
    status: res.status,
    headers: { "Cache-Control": "public, max-age=60" },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (findPrivateFields(body).length) {
    return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
  }
  return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
}
