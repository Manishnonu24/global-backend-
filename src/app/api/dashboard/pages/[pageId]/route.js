import { NextResponse } from "next/server";
import { getPageCapabilities } from "@/lib/pageCapabilities";
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
    const page = await pageService.getById(auth.siteId, pageId);
    return NextResponse.json(apiSuccess({ page }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }


    const { pageId } = await params;
    const body = await req.json();

    const current = await pageService.getById(auth.siteId, pageId);
    const caps = getPageCapabilities(current);

    if (!caps.canEditSlug) {
      delete body.slug;
    }
    
    if (!caps.canDisable) {
      delete body.isEnabled;
      delete body.showInNav;
    }
    
    if (!caps.canEditMetadata) {
      delete body.title;
      delete body.templateKey;
    }
    
    if (!caps.canEditSeo) {
      delete body.seoTitle;
      delete body.seoDescription;
      delete body.canonicalUrl;
      delete body.ogImage;
      delete body.jsonLd;
      delete body.seoKeywords;
    }

    if (body.status && body.status !== current.status) {
      const authAdmin = await checkSitePermission(req, "ADMIN");
      if (authAdmin.error) {
        return NextResponse.json({ error: "Only admins can change page status" }, { status: 403 });
      }
    }

    const updatedPage = await pageService.update(auth.siteId, pageId, body, auth.userId || "SYSTEM");
    return NextResponse.json(apiSuccess({ page: updatedPage }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;
    const current = await pageService.getById(auth.siteId, pageId);
    const { canSoftDelete } = getPageCapabilities(current);
    if (!canSoftDelete) {
      return NextResponse.json({ error: "Cannot delete this page type" }, { status: 400 });
    }

    await pageService.delete(auth.siteId, pageId, auth.userId || "SYSTEM");

    return NextResponse.json(apiSuccess({ message: "Page successfully deleted" }));
  } catch (err) {
    return handleApiError(err);
  }
}
