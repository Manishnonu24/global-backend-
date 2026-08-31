import { NextResponse } from "next/server";
import { leadService } from "@/services/lead.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const lead = await leadService.getById(auth.siteId, id);
    return NextResponse.json(apiSuccess({ lead }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const lead = await leadService.update(auth.siteId, id, body, auth.user.id);
    return NextResponse.json(apiSuccess({ lead }));
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
    await leadService.delete(auth.siteId, id, auth.user.id);

    return NextResponse.json(apiSuccess({ message: "Lead deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
