import { NextResponse } from "next/server";
import { getHealthPayload } from "../route";

export async function GET() {
  const payload = await getHealthPayload();
  return NextResponse.json(payload, { status: payload.checks.db === "ok" ? 200 : 503 });
}
