import { NextResponse } from "next/server";
import { legalPageService } from "@/services/legalPage.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, context) {
  try {
    const params = await context.params;
    const type = params?.type;
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const legalPage = await legalPageService.getPageByType(auth.siteId, type);
    return NextResponse.json(apiSuccess({ legalPage: legalPage || null }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req, context) {
  try {
    const params = await context.params;
    const type = params?.type;
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const legalPage = await legalPageService.savePage(auth.siteId, type, body, auth.user.id);

    return NextResponse.json(apiSuccess({ legalPage }));
  } catch (err) {
    return handleApiError(err);
  }
}

