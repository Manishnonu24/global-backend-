import { NextResponse } from "next/server";
import { postService } from "@/services/post.service";
import { handleApiError, apiSuccess } from "@/core/errors";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function POST(req) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    await postService.checkScheduledPosts();
    return NextResponse.json(apiSuccess({ message: "Scheduled posts processed successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    await postService.checkScheduledPosts();
    return NextResponse.json(apiSuccess({ message: "Scheduled posts processed successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
