import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { sectionRepository } from "@/repositories/section.repository";
import { checkSitePermission } from "@/lib/apiAuth";
import { sectionSchemas } from "@/components/cms/sectionRegistry";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;
    await pageService.getById(auth.siteId, pageId);

    const sections = await sectionRepository.findMany(auth.siteId, {
      where: { pageId, isDeleted: false },
      orderBy: { order: "asc" }
    });

    return NextResponse.json(apiSuccess({ sections }));
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

    const { pageId } = await params;
    const page = await pageService.getById(auth.siteId, pageId);

    const body = await req.json();
    const { type, content, name, order, regionKey = "main" } = body;

    if (!type) {
      return NextResponse.json({ error: "Section type is required" }, { status: 400 });
    }

    const { canAddSections } = getPageCapabilities(page);
    if (!canAddSections) {
      return NextResponse.json({ error: "Forbidden: Cannot add sections on this page type" }, { status: 403 });
    }

    // Template validation
    const templateKey = page.templateKey || (page.pageType === "CMS_BUILT" ? "GENERAL" : null);
    if (!templateKey) {
      return NextResponse.json({ error: "No template configuration found for this page." }, { status: 400 });
    }

    // Dynamic import to avoid circular dependencies or weird top-level awaits if any
    const { TEMPLATE_REGISTRY } = await import("@/components/cms/templateRegistry");
    const template = TEMPLATE_REGISTRY[templateKey];
    if (!template) {
      return NextResponse.json({ error: `Template ${templateKey} not found in registry.` }, { status: 400 });
    }

    const region = template.regions[regionKey];
    if (!region) {
      return NextResponse.json({ error: `Region '${regionKey}' is not allowed in template '${templateKey}'.` }, { status: 400 });
    }

    if (region.allowedBlocks && !region.allowedBlocks.includes(type)) {
      return NextResponse.json({ error: `Block type '${type}' is not allowed in region '${regionKey}'.` }, { status: 400 });
    }

    // Check maxItems
    if (region.maxItems !== null) {
      const currentCount = await sectionRepository.count(auth.siteId, {
        pageId,
        regionKey,
        isDeleted: false
      });
      if (currentCount >= region.maxItems) {
        return NextResponse.json({ error: `Region '${regionKey}' has reached its maximum of ${region.maxItems} blocks.` }, { status: 400 });
      }
    }

    // Validate using existing schemas
    if (body.content) {
      const schema = sectionSchemas[type];
      if (schema) {
        const parsed = schema.safeParse(body.content);
        if (!parsed.success) {
          return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
      }
    }

    const section = await pageService.addSection(auth.siteId, pageId, {
      type,
      content: content || {},
      name,
      order,
      regionKey
    });

    return NextResponse.json(apiSuccess({ section }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
