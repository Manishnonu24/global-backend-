import { NextResponse } from "next/server";
import { pushService } from "@/services/push.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req, { params }) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const { id } = await params;
    const notification = await pushService.duplicateNotification(auth.siteId, id);
    return NextResponse.json(apiSuccess({ notification }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
