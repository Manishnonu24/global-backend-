import { NextResponse } from "next/server";
import { versionService } from "@/services/version.service";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;

    // Verify the page exists
    await pageService.getById(auth.siteId, pageId);

    const versions = await versionService.list(auth.siteId, "PAGE", pageId);
    return NextResponse.json(apiSuccess({ versions }));
  } catch (err) {
    return handleApiError(err);
  }
}
