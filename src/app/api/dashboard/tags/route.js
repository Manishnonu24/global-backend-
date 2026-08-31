import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { z } from "zod";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// GET /api/dashboard/tags - List all tags for the site
export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const tags = await prisma.tag.findMany({
      where: { siteId: auth.siteId, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
    return NextResponse.json(apiSuccess({ tags }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Fetch tags error:");
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

const CreateTagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});

// POST /api/dashboard/tags - Create a tag
export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const data = CreateTagSchema.parse(body);

    const baseSlug = (data.slug && slugify(data.slug)) || slugify(data.name);

    // Check if tag with this name or slug already exists for this site
    const existing = await prisma.tag.findFirst({
      where: {
        siteId: auth.siteId,
        deletedAt: null,
        OR: [
          { name: { equals: data.name } },
          { slug: baseSlug },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name or slug already exists." },
        { status: 400 },
      );
    }

    const tag = await prisma.tag.create({
      data: {
        siteId: auth.siteId,
        name: data.name.trim(),
        slug: baseSlug,
      },
    });

    return NextResponse.json(apiSuccess({ tag }), { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Create tag error:");
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 },
    );
  }
}
