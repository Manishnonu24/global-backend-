import { NextResponse } from "next/server";
import { campaignService } from "@/services/campaign.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const templates = await campaignService.getTemplates(siteId);
    return NextResponse.json(apiSuccess({ templates }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const template = await campaignService.createTemplate(siteId, body);
    return NextResponse.json(apiSuccess({ template }));
  } catch (err) {
    return handleApiError(err);
  }
}
