import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { canAssignRole, ROLES } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = z.object({
  email: z.string().regex(emailRegex, { message: "Invalid email format" }),
  password: z.string().min(6),
  globalRole: z
    .enum(["SUPERADMIN", "ADMIN", "EDITOR", "AUTHOR", "MARKETING", "VIEWER", "VISITOR"])
    .optional()
    .default("VIEWER"),
  siteIds: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const authUser = await requireAuth();
  const isDev = process.env.NODE_ENV === "development";
  let caller = authUser;
  if (!caller && isDev) {
    caller = await prisma.user.findFirst();
    if (caller) {
      caller = { ...caller, globalRole: "SUPERADMIN" };
    }
  }

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (caller.globalRole !== "SUPERADMIN" && caller.globalRole !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 },
    );
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        globalRole: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  // Authenticate caller (server authoritative)
  const authUser = await requireAuth();
  const isDev = process.env.NODE_ENV === "development";
  let caller = authUser;
  if (!caller && isDev) {
    caller = await prisma.user.findFirst();
    if (caller) {
      caller = { ...caller, globalRole: "SUPERADMIN" };
    }
  }

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (caller.globalRole !== "SUPERADMIN" && caller.globalRole !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 },
    );
  }

  try {
    // Read and validate request body once
    const body = await req.json();
    const validated = UserSchema.parse(body);

    // Enforce role assignment policy
    // canAssignRole should return true if caller can assign the requested role
    if (!canAssignRole(caller.globalRole, validated.globalRole)) {
      return NextResponse.json(
        { error: "Forbidden: cannot assign role higher than your own" },
        { status: 403 },
      );
    }

    // Create user
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash: hashedPassword,
        globalRole: validated.globalRole,
      },
    });

    // Assign site access if siteIds were provided
    if (validated.siteIds.length > 0) {
      const siteUserData = validated.siteIds.map((siteId) => ({
        siteId,
        userId: newUser.id,
        role: "EDITOR",
      }));
      await prisma.siteUser.createMany({
        data: siteUserData,
        skipDuplicates: true,
      });
    }

    // Audit: log that caller created this new user
    try {
      await logAction(null, caller.id, "USER_CREATED", {
        targetUserId: newUser.id,
        email: validated.email,
      });
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Failed to write audit log:");
    }

    const { passwordHash, ...userWithoutPassword } = newUser;
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues || error.errors },
        { status: 400 },
      );
    }

    // Prisma unique constraint (email)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists", meta: error.meta },
        { status: 409 },
      );
    }

    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "User creation error:");
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}
