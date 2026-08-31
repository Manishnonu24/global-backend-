import { NextResponse } from "next/server";
import { serviceService } from "@/services/service.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { serviceId } = await params;
    const service = await serviceService.regenerateToken(auth.siteId, serviceId, auth.user.id);
    return NextResponse.json(apiSuccess({ service }));
  } catch (err) {
    return handleApiError(err);
  }
}
