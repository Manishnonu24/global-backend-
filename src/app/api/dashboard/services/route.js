import { NextResponse } from "next/server";
import { serviceService } from "@/services/service.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const services = await serviceService.getServices(auth.siteId);
    return NextResponse.json(apiSuccess({ services }));
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
    const service = await serviceService.create(auth.siteId, body, auth.user.id);
    return NextResponse.json(apiSuccess({ service }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
