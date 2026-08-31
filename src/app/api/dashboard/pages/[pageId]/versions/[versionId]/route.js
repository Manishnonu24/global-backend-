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

    const { pageId, versionId } = await params;
    await pageService.getById(auth.siteId, pageId);

    const data = await versionService.getVersionData(
      auth.siteId,
      "PAGE",
      pageId,
      versionId,
    );
    return NextResponse.json(apiSuccess({ version: data }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId, versionId } = await params;
    await pageService.getById(auth.siteId, pageId);

    const restored = await versionService.restorePageVersion(
      auth.siteId,
      pageId,
      versionId,
      auth.user?.id || null,
    );
    return NextResponse.json(apiSuccess({ page: restored }));
  } catch (err) {
    return handleApiError(err);
  }
}
