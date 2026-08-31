import { NextResponse } from "next/server";
import { campaignService } from "@/services/campaign.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const { id } = await params;
    const campaign = await campaignService.duplicateCampaign(siteId, id);
    return NextResponse.json(apiSuccess({ campaign }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
