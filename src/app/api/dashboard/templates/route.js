import { NextResponse } from "next/server";

const DEPRECATION_MESSAGE = "This legacy template API is deprecated. Use /api/dashboard/pages/[pageId]/sections/* instead.";

export async function GET(req) {
  return NextResponse.json({ error: DEPRECATION_MESSAGE }, { status: 410 });
}

export async function PUT(req) {
  return NextResponse.json({ error: DEPRECATION_MESSAGE }, { status: 410 });
}
