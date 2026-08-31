import { NextResponse } from "next/server";
import { faqService } from "@/services/faq.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || undefined;

    const faqs = await faqService.getFaqs(siteId, {
      pageSlug: page,
      showHide: true,
      includePage: true,
    });
    return NextResponse.json(apiSuccess({ faqs }));
  } catch (err) {
    return handleApiError(err);
  }
}
