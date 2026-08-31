import { NextResponse } from "next/server";
import { campaignService } from "@/services/campaign.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const { id } = await params;
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await campaignService.sendTestEmail(siteId, id, email);
    return NextResponse.json(apiSuccess(result));
  } catch (err) {
    return handleApiError(err);
  }
}
