import { NextResponse } from "next/server";
import { leadService } from "@/services/lead.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const leads = await leadService.getLeads(auth.siteId, { status });
    return NextResponse.json(apiSuccess({ leads }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const lead = await leadService.create(auth.siteId, body, auth.user.id);
    return NextResponse.json(apiSuccess({ lead }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
