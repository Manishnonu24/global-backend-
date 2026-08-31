import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { ROLES, ROLE_LEVEL } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { getRequestId } from "@/lib/observability/requestContext";


// Helper to enforce Admin access for all routes in this file
async function checkAdminAuth() {
  const user = await requireAuth();
  const isDev = process.env.NODE_ENV === "development";

  let caller = user;
  if (!caller && isDev) {
    // FETCH REAL USER to satisfy foreign key constraints
    caller = await prisma.user.findFirst();
    if (caller) {
      caller = { ...caller, globalRole: "SUPERADMIN" };
    }
  }

  if (!caller) {
    return { error: "Unauthorized", status: 401 };
  }

  if (caller.globalRole !== "SUPERADMIN" && caller.globalRole !== "ADMIN") {
    return { error: "Forbidden: Admin access required", status: 403 };
  }

  return { user: caller };
}

// GET: View specific user details
export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await checkAdminAuth();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        loginHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { passwordHash, ...userProfile } = user;
    return NextResponse.json({ user: userProfile });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "GET User ID Error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH: Update user role or status
export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await checkAdminAuth();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const caller = auth.user;

    // Retrieve target user
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role levels verification
    const c = ROLE_LEVEL[caller.globalRole] || 0;
    const t = ROLE_LEVEL[target.globalRole] || 0;

    // Caller must have higher or equal role to modify target
    if (c < t) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges to modify this user" },
        { status: 403 },
      );
    }

    // If changing role, verify caller can assign that role
    if (body.globalRole) {
      const n = ROLE_LEVEL[body.globalRole] || 0;
      if (c < n) {
        return NextResponse.json(
          { error: "Forbidden: Cannot assign role higher than your own" },
          { status: 403 },
        );
      }
    }

    const updateData = {};
    if (body.globalRole !== undefined) updateData.globalRole = body.globalRole;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;

    let twoFaResetOccurred = false;
    if (body.twoFAEnabled === false) {
      updateData.twoFAEnabled = false;
      twoFaResetOccurred = true;
      try {
        await prisma.twofactor.delete({
          where: { userId: id },
        });
      } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
        // Suppress if the 2FA secret doesn't exist
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (twoFaResetOccurred) {
      try {
        await logAction(null, caller.id, "USER_2FA_DISABLED_BY_ADMIN", {
          targetUserId: id,
          targetEmail: target.email,
        });
      } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
        Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Failed to write audit log:");
      }
    }

    try {
      await logAction(null, caller.id, "USER_ROLE_UPDATED", {
        targetUserId: id,
        newRole:
          body.globalRole !== undefined ? body.globalRole : target.globalRole,
        isActive: body.isActive !== undefined ? body.isActive : target.isActive,
      });
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Failed to write audit log:");
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "PATCH Error:");
    return NextResponse.json(
      { error: "Failed to update", message: String(error?.message || error) },
      { status: 500 },
    );
  }
}

function canDeleteRole(creatorRole, targetRole) {
  const c = ROLE_LEVEL[creatorRole] || 0;
  const t = ROLE_LEVEL[targetRole] || 0;
  // require that creator's role level is strictly greater than target's
  return c > t;
}

export async function DELETE(req, context) {
  try {
    // Next passes params as a Promise in some runtimes for route handlers; await it.
    const params = await context.params;
    const id = params?.id;

    // Auth
    const authUser = await requireAuth();
    const isDev = process.env.NODE_ENV === "development";

    let caller = authUser;
    if (!caller && isDev) {
      // dev fallback
      caller = await prisma.user.findFirst();
      if (!caller) {
        return NextResponse.json(
          { error: "No users found in DB for dev bypass" },
          { status: 401 },
        );
      }
    }

    if (!caller)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    // Find target user
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isSelfDelete = caller.id === id;

    // Prevent deleting the last active Superadmin
    if (target.globalRole === "SUPERADMIN") {
      const superadminCount = await prisma.user.count({
        where: { globalRole: "SUPERADMIN", isActive: true, deletedAt: null },
      });
      if (superadminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Cannot delete the last active Superadmin account",
          },
          { status: 403 },
        );
      }
    }

    // If not self-deletion, require caller role strictly higher than target role
    if (!isSelfDelete) {
      if (!canDeleteRole(caller.globalRole, target.globalRole)) {
        return NextResponse.json(
          {
            error: "Forbidden: insufficient permission to deactivate this user",
          },
          { status: 403 },
        );
      }
    }

    // Delete related records to avoid RESTRICT foreign key violations
    // AuditLog and LoginHistory have required User references without Cascade
    await prisma.loginHistory.deleteMany({ where: { userId: id } });
    await prisma.auditLog.deleteMany({ where: { userId: id } });

    // Delete user
    await prisma.user.delete({ where: { id } });

    // Audit log
    try {
      await logAction(
        null,
        caller.id,
        isSelfDelete ? "USER_SELF_DELETED" : "USER_DELETED",
        { targetUserId: id },
      );
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Failed to write audit log:");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "DELETE /api/dashboard/users/[id] error:");
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err?.message || err) },
      { status: 500 },
    );
  }
}
