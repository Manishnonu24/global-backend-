import { NextResponse } from "next/server";
import { serviceService } from "@/services/service.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { serviceId } = await params;
    const service = await serviceService.getById(auth.siteId, serviceId);
    return NextResponse.json(apiSuccess({ service }));
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

    const { serviceId } = await params;
    const body = await req.json();
    const service = await serviceService.update(auth.siteId, serviceId, body, auth.user.id);
    return NextResponse.json(apiSuccess({ service }));
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

    const { serviceId } = await params;
    await serviceService.delete(auth.siteId, serviceId, auth.user.id);

    return NextResponse.json(apiSuccess({ message: "Service deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
