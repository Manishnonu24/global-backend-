import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getRequestId } from "@/lib/observability/requestContext";

const CreateSiteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  domain: z.string().optional().nullable(),
});

export async function GET(req) {
  const authUser = await requireAuth();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.globalRole !== "SUPERADMIN" && authUser.globalRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sites = await prisma.site.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            pages: true,
            posts: true,
            services: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ sites });
  } catch (error) {
    const _reqId = getRequestId(req);
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "GET /api/dashboard/sites error:");
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  const authUser = await requireAuth();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.globalRole !== "SUPERADMIN" && authUser.globalRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = CreateSiteSchema.parse(body);

    const site = await prisma.site.create({
      data: {
        name: validated.name,
        domain: validated.domain || null,
      },
    });

    // Auto-assign the creator as ADMIN on this site
    await prisma.siteUser.create({
      data: {
        siteId: site.id,
        userId: authUser.id,
        role: "ADMIN",
      },
    });

    try {
      await logAction(site.id, authUser.id, "SITE_CREATED", {
        siteName: validated.name,
      });
    } catch (logErr) {
      const _reqId = getRequestId(req);
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
      logger.error({ err: logErr, requestId: _reqId }, "Audit log error:");
    }

    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    const _reqId = getRequestId(req);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A site with this domain already exists" },
        { status: 409 },
      );
    }
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "POST /api/dashboard/sites error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
