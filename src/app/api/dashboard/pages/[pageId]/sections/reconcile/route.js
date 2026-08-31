import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { ensureCodeTemplatePage } from "@/lib/codeTemplatePages";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    if (page.pageType !== "CODE_TEMPLATE") {
      return NextResponse.json({ error: "Reconciliation is only for CODE_TEMPLATE pages" }, { status: 400 });
    }

    const { canEditContent } = getPageCapabilities(page);
    if (!canEditContent) {
      return NextResponse.json({ error: "Forbidden: Cannot modify sections on this page type" }, { status: 403 });
    }

    const result = await ensureCodeTemplatePage({
      siteId: auth.siteId,
      templateKey: page.templateKey,
    });

    return NextResponse.json(apiSuccess({ 
      createdSlots: result.createdSlots,
      migratedSections: result.migratedSections,
      existingSlots: result.existingSlots,
      ambiguousSections: result.ambiguousSections,
      invalidSections: result.invalidSections
    }));
  } catch (err) {
    return handleApiError(err);
  }
}
