import { NextResponse } from "next/server";
import { findPrivateFields, proxyCohort } from "@/lib/proxy-cohort";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const res = await proxyCohort(`/api/trials/${encodeURIComponent(id)}`);
  const body = await res.json().catch(() => ({ error: "unavailable" }));
  return NextResponse.json(body, { status: res.status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (findPrivateFields(body).length) {
    return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
  }
  return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
}
