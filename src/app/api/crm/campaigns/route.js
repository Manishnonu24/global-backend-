import { NextResponse } from "next/server";
import { campaignService } from "@/services/campaign.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const campaigns = await campaignService.getCampaigns(siteId);
    return NextResponse.json(apiSuccess({ campaigns }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const campaign = await campaignService.createCampaign(siteId, body);
    return NextResponse.json(apiSuccess({ campaign }));
  } catch (err) {
    return handleApiError(err);
  }
}
