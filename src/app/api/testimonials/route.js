import { NextResponse } from "next/server";
import { testimonialService } from "@/services/testimonial.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const testimonials = await testimonialService.getTestimonials(siteId, { showHide: true });
    return NextResponse.json(apiSuccess({ testimonials }));
  } catch (err) {
    return handleApiError(err);
  }
}
