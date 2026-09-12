import { NextResponse } from "next/server";
import { findPrivateFields } from "@/lib/proxy-cohort";

export async function GET() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (findPrivateFields(body).length) {
    return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
  }
  return NextResponse.json({ error: "private fields are not accepted" }, { status: 400 });
}
