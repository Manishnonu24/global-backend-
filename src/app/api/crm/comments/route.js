import { NextResponse } from "next/server";
import { commentService } from "@/services/comment.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ success: false, error: { message: auth.error } }, { status: auth.status });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const targetId = url.searchParams.get("targetId") || url.searchParams.get("postId") || "";
    const targetType = url.searchParams.get("targetType") || "";

    const comments = await commentService.getComments(auth.siteId, status || null, targetId || null, targetType || null);
    return NextResponse.json(apiSuccess({ comments }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ success: false, error: { message: auth.error } }, { status: auth.status });
    }

    const body = await req.json();
    const comment = await commentService.createComment(auth.siteId, body);
    return NextResponse.json(apiSuccess({ comment }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
