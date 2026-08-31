import { NextResponse } from "next/server";
import { checkS3Health } from "../../../../../utils/s3Utility";

export async function GET() {
  const result = await checkS3Health();
  const status = result.healthy ? 200 : result.configured ? 502 : 503;
  return NextResponse.json(result, { status });
}
