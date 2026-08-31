import { NextResponse } from "next/server";
import { testimonialService } from "@/services/testimonial.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const testimonial = await testimonialService.getById(auth.siteId, id);
    return NextResponse.json(apiSuccess({ testimonial }));
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

    const testimonial = await testimonialService.update(auth.siteId, id, body, auth.user.id);
    return NextResponse.json(apiSuccess({ testimonial }));
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
    await testimonialService.delete(auth.siteId, id, auth.user.id);

    return NextResponse.json(apiSuccess({ message: "Testimonial deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
