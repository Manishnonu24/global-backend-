import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import { getPageCapabilities } from "@/lib/pageCapabilities";

export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { pageId } = await params;
    const body = await req.json();
    const publishFlag = !!body.publish;

    // Load the page to verify capabilities
    const page = await pageService.getById(auth.siteId, pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    const capabilities = getPageCapabilities(page);
    if (!capabilities.canPublish) {
      return NextResponse.json({ error: "Publishing not allowed for this page type" }, { status: 403 });
    }

    const updated = await pageService.publishPage(auth.siteId, pageId, publishFlag);
    
    // Bust Next.js cache for the page
    if (updated.slug) {
      revalidatePath(updated.slug);
    }
    if (updated.templateKey === "HOME" || updated.slug === "/") {
      revalidatePath("/");
    }

    return NextResponse.json(apiSuccess({ page: updated }));
  } catch (err) {
    return handleApiError(err);
  }
}
