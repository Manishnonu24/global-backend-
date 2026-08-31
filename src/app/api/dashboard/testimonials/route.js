import { NextResponse } from "next/server";
import { testimonialService } from "@/services/testimonial.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const testimonials = await testimonialService.getTestimonials(auth.siteId);
    return NextResponse.json(apiSuccess({ testimonials }));
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
    const testimonial = await testimonialService.create(auth.siteId, body, auth.user.id);
    return NextResponse.json(apiSuccess({ testimonial }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
