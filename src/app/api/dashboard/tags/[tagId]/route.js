import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
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

// PATCH /api/dashboard/tags/[tagId] - Rename a tag
export async function PATCH(req, context) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const { tagId } = params;
  const body = await req.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Tag name is required" },
      { status: 400 },
    );
  }

  const trimmedName = name.trim();
  const newSlug = slugify(trimmedName);

  try {
    // Verify tag belongs to site
    const existing = await prisma.tag.findFirst({
      where: { id: tagId, siteId: auth.siteId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 },
      );
    }

    // Check collision with another tag on the same site
    const collision = await prisma.tag.findFirst({
      where: {
        siteId: auth.siteId,
        deletedAt: null,
        id: { not: tagId },
        OR: [
          { name: { equals: trimmedName } },
          { slug: newSlug },
        ],
      },
    });

    if (collision) {
      return NextResponse.json(
        { error: "A tag with this name or slug already exists." },
        { status: 400 },
      );
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { name: trimmedName, slug: newSlug },
    });

    return NextResponse.json(apiSuccess({ tag }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Rename tag error:");
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 },
    );
  }
}

// DELETE /api/dashboard/tags/[tagId] - Delete a tag
export async function DELETE(req, context) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const { tagId } = params;

  try {
    const existing = await prisma.tag.findFirst({
      where: { id: tagId, siteId: auth.siteId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 },
      );
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json(
      apiSuccess({ message: "Tag deleted successfully" }),
    );
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Delete tag error:");
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 },
    );
  }
}
