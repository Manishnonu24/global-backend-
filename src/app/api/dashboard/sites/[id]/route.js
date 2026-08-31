import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { logAction } from "@/lib/audit";
import { getRequestId } from "@/lib/observability/requestContext";


export async function PATCH(req, { params }) {
  const authUser = await requireAuth();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.globalRole !== "SUPERADMIN" && authUser.globalRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, domain, isActive } = body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (domain !== undefined) data.domain = domain;
    if (isActive !== undefined) data.isActive = isActive;

    const site = await prisma.site.update({
      where: { id },
      data,
    });

    try {
      await logAction(site.id, authUser.id, "SITE_UPDATED", {
        siteName: site.name,
        changes: Object.keys(data),
      });
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Audit log error:");
    }

    return NextResponse.json({ site });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A site with this domain already exists" },
        { status: 409 },
      );
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "PATCH /api/dashboard/sites/[id] error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  const authUser = await requireAuth();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Only SUPERADMIN can delete sites
  if (authUser.globalRole !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft delete: set deletedAt
    const site = await prisma.site.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    try {
      await logAction(site.id, authUser.id, "SITE_DELETED", {
        siteName: site.name,
      });
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Audit log error:");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "DELETE /api/dashboard/sites/[id] error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
