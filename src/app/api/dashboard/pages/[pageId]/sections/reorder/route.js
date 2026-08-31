import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import { getPageCapabilities } from "@/lib/pageCapabilities";


export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    const { canReorderSections } = getPageCapabilities(page);
    if (!canReorderSections) {
      return NextResponse.json({ error: "Forbidden: Cannot reorder sections on this page type" }, { status: 403 });
    }

    const body = await req.json();
    const { orderedIds, regionKey } = body;

    // Check if region is reorderable according to template
    const templateKey = page.templateKey || (page.pageType === "CMS_BUILT" ? "GENERAL" : null);
    if (templateKey && regionKey) {
      const { TEMPLATE_REGISTRY } = await import("@/components/cms/templateRegistry");
      const template = TEMPLATE_REGISTRY[templateKey];
      if (template) {
        const region = template.regions[regionKey];
        if (region && region.reorderable === false) {
          return NextResponse.json({ error: `Region '${regionKey}' cannot be reordered.` }, { status: 400 });
        }
      }
    }

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
    }

    if (!regionKey) {
      return NextResponse.json({ error: "regionKey is required for reordering" }, { status: 400 });
    }

    await pageService.reorderSections(auth.siteId, pageId, regionKey, orderedIds);
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
