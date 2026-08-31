import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { sectionRepository } from "@/repositories/section.repository";
import { checkSitePermission } from "@/lib/apiAuth";
import { sectionSchemas } from "@/components/cms/sectionRegistry";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { handleApiError, apiSuccess } from "@/core/errors";
import { validateContractContent } from "@/lib/templateSlotFields";

export async function PATCH(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId, sectionId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    const { canEditContent } = getPageCapabilities(page);
    if (!canEditContent) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify sections on this page type" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const section = await sectionRepository.findUnique(auth.siteId, sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Validation is now handled authoritatively by the service layer.

    const updated = await pageService.updateSection(
      auth.siteId,
      pageId,
      sectionId,
      body
    );
    return NextResponse.json(apiSuccess({ section: updated }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId, sectionId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    const { canDeleteSections } = getPageCapabilities(page);
    if (!canDeleteSections) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete sections on this page type" },
        { status: 403 }
      );
    }

    const section = await sectionRepository.findUnique(auth.siteId, sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    await pageService.deleteSection(auth.siteId, pageId, sectionId);
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
