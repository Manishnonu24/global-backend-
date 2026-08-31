import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { frontendAuthOptions } from "@/lib/frontendAuth";
import prisma from "@/lib/prisma";
import { commentService } from "@/services/comment.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess, UnauthorizedError, ValidationError } from "@/core/errors";
import { checkRateLimit } from "@/lib/rateLimiter";

const VALID_TARGET_TYPES = ["post", "magazine"];

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const url = new URL(req.url);
    const targetType = url.searchParams.get("targetType") || url.searchParams.get("type") || "";
    const targetId = url.searchParams.get("targetId") || url.searchParams.get("postId") || url.searchParams.get("slug") || "";

    // Validate explicit targetType if provided
    if (targetType && !VALID_TARGET_TYPES.includes(targetType)) {
      throw new ValidationError({ field: "targetType", message: `targetType must be one of: ${VALID_TARGET_TYPES.join(", ")}` });
    }

    const comments = await commentService.getPublicComments(siteId, { targetType, targetId });
    return NextResponse.json(apiSuccess({ comments }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const allowed = await checkRateLimit(ip, 30);
    if (!allowed) {
      return NextResponse.json({ success: false, error: { message: "Rate limit exceeded" } }, { status: 429 });
    }

    // Step 1: Strictly authenticate using frontend user session (never dashboard auth)
    const session = await getServerSession(frontendAuthOptions);
    if (!session?.user) {
      throw new UnauthorizedError("You must be logged in to submit a comment.");
    }

    const sessionUserId = session.user.id;
    const sessionUserEmail = session.user.email;

    if (!sessionUserId && (!sessionUserEmail || !sessionUserEmail.trim())) {
      throw new UnauthorizedError("Your session does not contain valid user credentials. Please log out and log in again.");
    }

    // Step 2: Load current authoritative User record from database (handles profile renames / stale JWT)
    const currentUser = await prisma.user.findFirst({
      where: {
        OR: [
          sessionUserId ? { id: String(sessionUserId) } : undefined,
          sessionUserEmail ? { email: String(sessionUserEmail).trim() } : undefined,
        ].filter(Boolean),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!currentUser || !currentUser.email) {
      throw new UnauthorizedError("User account not found or is inactive.");
    }

    // Step 3: Derive author fields from current DB record (with email local-part fallback if name is empty)
    const authorEmail = currentUser.email.trim();
    const authorName = (currentUser.name || "").trim() || authorEmail.split("@")[0];

    const siteId = getSiteId(req);
    const body = await req.json();

    // Validate explicit targetType if provided
    const targetType = body.targetType;
    if (targetType && !VALID_TARGET_TYPES.includes(targetType)) {
      throw new ValidationError({ field: "targetType", message: `targetType must be one of: ${VALID_TARGET_TYPES.join(", ")}` });
    }

    const comment = await commentService.createComment(siteId, {
      targetType: body.targetType,
      targetId: body.targetId || body.postId || body.magazineId,
      content: body.content,
      // Derived from current User database record — request body authorName/authorEmail are intentionally ignored
      authorName,
      authorEmail,
    });

    return NextResponse.json(apiSuccess({ comment }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

