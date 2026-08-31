import { NextResponse } from "next/server";
import { campaignService } from "@/services/campaign.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const { id } = await params;
    const { campaign, stats, recentLogs } = await campaignService.getCampaignAnalytics(siteId, id);
    return NextResponse.json(apiSuccess({ campaign, stats, recentLogs }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const { id } = await params;
    const body = await req.json();
    const campaign = await campaignService.updateCampaign(siteId, id, body);
    return NextResponse.json(apiSuccess({ campaign }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const { id } = await params;
    await campaignService.deleteCampaign(siteId, id);
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
