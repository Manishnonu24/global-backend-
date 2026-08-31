import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError } from "@/core/errors";
import { can } from "@/lib/pageCapabilities";
import { resolvePagePreviewPath } from "@/lib/routeClassification";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function GET(req, { params }) {
  let targetPath = null;
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (!can("canPreview", page)) {
      return NextResponse.json({ error: "Preview is not supported for this page type" }, { status: 403 });
    }

    // Determine target path first
    targetPath = resolvePagePreviewPath(page);
    
    if (!targetPath) {
      return NextResponse.json(
        { error: "This page has an unresolved dynamic route pattern and cannot be previewed." }, 
        { status: 400 }
      );
    }

    // Enable draft mode only after a valid preview target is resolved
    const draft = await draftMode();
    draft.enable();

    // Add a safe marker using URL construction
    const targetUrl = new URL(targetPath, req.url);
    targetUrl.searchParams.set("cmsPreview", "1");
    targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    return handleApiError(err);
  }

  // Call redirect outside try/catch
  if (targetPath) {
    redirect(targetPath);
  } else {
    return NextResponse.json({ error: "Could not determine target path" }, { status: 500 });
  }
}
