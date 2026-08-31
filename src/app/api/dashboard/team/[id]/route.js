import { NextResponse } from "next/server";
import { teamMemberService } from "@/services/teamMember.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const member = await teamMemberService.getById(auth.siteId, id);
    return NextResponse.json(apiSuccess({ teamMember: member }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const member = await teamMemberService.update(auth.siteId, id, body, auth.user.id);

    return NextResponse.json(apiSuccess({ teamMember: member }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await teamMemberService.delete(auth.siteId, id, auth.user.id);
    return NextResponse.json(apiSuccess({ message: "Team member deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
