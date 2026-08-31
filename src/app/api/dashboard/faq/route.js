import { NextResponse } from "next/server";
import { faqService } from "@/services/faq.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const faqs = await faqService.getFaqs(auth.siteId, { includePage: true });
    return NextResponse.json(apiSuccess({ faqs }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const faq = await faqService.create(auth.siteId, body, auth.user.id);
    return NextResponse.json(apiSuccess({ faq }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
