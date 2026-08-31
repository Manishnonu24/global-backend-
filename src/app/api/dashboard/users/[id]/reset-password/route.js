import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { ROLE_LEVEL } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/audit";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


async function checkAdminAuth() {
  const user = await requireAuth();
  const isDev = process.env.NODE_ENV === "development";

  let caller = user;
  if (!caller && isDev) {
    caller = await prisma.user.findFirst();
    if (caller) {
      caller = { ...caller, globalRole: "SUPERADMIN" };
    }
  }

  if (!caller) return { error: "Unauthorized", status: 401 };

  if (caller.globalRole !== "SUPERADMIN" && caller.globalRole !== "ADMIN") {
    return { error: "Forbidden: Admin access required", status: 403 };
  }

  return { user: caller };
}

export async function POST(req, { params }) {
  const { id } = await params;
  const auth = await checkAdminAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const caller = auth.user;

    // Find target user
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role level check
    const c = ROLE_LEVEL[caller.globalRole] || 0;
    const t = ROLE_LEVEL[target.globalRole] || 0;

    if (c < t) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges to reset password for this user" },
        { status: 403 }
      );
    }

    // Optional custom password in body or default to Temp@123
    let newPassword = "Temp@123";
    try {
      const body = await req.json();
      if (body?.password) {
        newPassword = body.password;
      }
    } catch (_) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      // Body empty or not JSON, fallback to default
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    // Write audit log
    await logAction(null, caller.id, "ADMIN_USER_PASSWORD_RESET", {
      targetUserId: id,
      targetEmail: target.email,
    });

    return NextResponse.json(apiSuccess({ message: `Password successfully reset to '${newPassword}'` }));
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Reset Password API Error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
