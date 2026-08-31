import { NextResponse } from "next/server";
import { faqService } from "@/services/faq.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const faq = await faqService.getById(auth.siteId, id);
    return NextResponse.json(apiSuccess({ faq }));
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

    const { id } = await params;
    const body = await req.json();

    const faq = await faqService.update(auth.siteId, id, body, auth.user.id);
    return NextResponse.json(apiSuccess({ faq }));
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

    const { id } = await params;
    await faqService.delete(auth.siteId, id, auth.user.id);

    return NextResponse.json(apiSuccess({ message: "FAQ deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
