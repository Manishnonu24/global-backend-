import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess, handleApiError } from "@/core/errors";
import { pageService } from "@/services/page.service";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { logAction } from "@/lib/audit";

const ALLOWED_OWNER_TYPES = [
  "page",
  "post",
  "service",
  "magazine",
  "quizType",
  "recipe",
  "legalPage",
];

function isSafeUrlOrPath(val) {
  if (!val || typeof val !== "string") return true;
  const clean = val.trim().toLowerCase();
  if (clean.startsWith("javascript:") || clean.startsWith("data:")) {
    return false;
  }
  if (clean.startsWith("/") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return true;
  }
  return false;
}

const seoUpdateSchema = z.object({
  seoTitle: z
    .string()
    .max(255, "SEO Title must not exceed 255 characters")
    .nullable()
    .optional(),
  seoKeywords: z
    .string()
    .max(1000, "Meta keywords must not exceed 1000 characters")
    .nullable()
    .optional(),
  seoDescription: z
    .string()
    .max(1000, "SEO Description must not exceed 1000 characters")
    .nullable()
    .optional(),
  canonicalUrl: z
    .string()
    .max(500, "Canonical URL must not exceed 500 characters")
    .refine((val) => !val || isSafeUrlOrPath(val), {
      message: "Canonical URL must be a valid http://, https://, or site-relative path starting with /",
    })
    .nullable()
    .optional(),
  ogImage: z
    .string()
    .max(500, "OG Image URL must not exceed 500 characters")
    .refine((val) => !val || isSafeUrlOrPath(val), {
      message: "OG Image must be a valid http://, https://, or site-relative path starting with /",
    })
    .nullable()
    .optional(),
  jsonLd: z
    .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
    .nullable()
    .optional(),
});

export async function PUT(req, { params }) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { ownerType, ownerId } = await params;

    if (!ALLOWED_OWNER_TYPES.includes(ownerType)) {
      return NextResponse.json(
        { error: `Invalid ownerType '${ownerType}'. Allowed: ${ALLOWED_OWNER_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Validate using Zod schema
    const parseResult = seoUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstErr = parseResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }

    const data = parseResult.data;

    // Partial update payload builder: only set fields explicitly passed in rawBody
    const updateData = {};
    if (Object.prototype.hasOwnProperty.call(rawBody, "seoTitle")) {
      updateData.seoTitle = data.seoTitle === "" ? null : data.seoTitle;
    }
    if (ownerType === "page" && Object.prototype.hasOwnProperty.call(rawBody, "seoKeywords")) {
      updateData.seoKeywords = data.seoKeywords === "" ? null : data.seoKeywords;
    }
    if (Object.prototype.hasOwnProperty.call(rawBody, "seoDescription")) {
      updateData.seoDescription = data.seoDescription === "" ? null : data.seoDescription;
    }
    if (Object.prototype.hasOwnProperty.call(rawBody, "canonicalUrl")) {
      updateData.canonicalUrl = data.canonicalUrl === "" ? null : data.canonicalUrl;
    }
    if (Object.prototype.hasOwnProperty.call(rawBody, "ogImage")) {
      updateData.ogImage = data.ogImage === "" ? null : data.ogImage;
    }
    if (Object.prototype.hasOwnProperty.call(rawBody, "jsonLd")) {
      updateData.jsonLd = data.jsonLd;
    }

    let updatedEntity = null;

    // Delegate Page update to PageService & Capability Check
    if (ownerType === "page") {
      const page = await pageService.getById(auth.siteId, ownerId);
      if (!page) {
        return NextResponse.json({ error: "Page record not found or does not belong to active site" }, { status: 404 });
      }

      const caps = getPageCapabilities(page);
      if (!caps.canEditSeo) {
        return NextResponse.json({ error: "SEO editing is prohibited for this page type" }, { status: 403 });
      }

      updatedEntity = await pageService.update(auth.siteId, page.id, updateData);
    } else if (ownerType === "post") {
      const post = await prisma.post.findFirst({
        where: { id: ownerId, siteId: auth.siteId, deletedAt: null },
      });
      if (!post) {
        return NextResponse.json({ error: "Post record not found or access denied" }, { status: 404 });
      }

      updatedEntity = await prisma.post.update({
        where: { id: post.id },
        data: updateData,
      });
    } else if (ownerType === "service") {
      const service = await prisma.service.findFirst({
        where: { id: ownerId, siteId: auth.siteId, deletedAt: null },
      });
      if (!service) {
        return NextResponse.json({ error: "Service record not found or access denied" }, { status: 404 });
      }

      updatedEntity = await prisma.service.update({
        where: { id: service.id },
        data: updateData,
      });
    } else if (ownerType === "legalPage") {
      const legalPage = await prisma.legalPage.findFirst({
        where: { id: ownerId, siteId: auth.siteId, deletedAt: null },
      });
      if (!legalPage) {
        return NextResponse.json({ error: "Legal page record not found or access denied" }, { status: 404 });
      }

      updatedEntity = await prisma.legalPage.update({
        where: { id: legalPage.id },
        data: updateData,
      });
    } else if (ownerType === "recipe") {
      const recipe = await prisma.recipe.findFirst({
        where: { id: ownerId },
      });
      if (!recipe) {
        return NextResponse.json({ error: "Recipe record not found" }, { status: 404 });
      }

      if (recipe.siteId && recipe.siteId !== auth.siteId && auth.user?.globalRole !== "SUPERADMIN") {
        return NextResponse.json({ error: "Access denied to recipe owned by another site" }, { status: 403 });
      }

      updatedEntity = await prisma.recipe.update({
        where: { id: recipe.id },
        data: updateData,
      });
    } else if (ownerType === "quizType") {
      const intId = Number(ownerId);
      if (isNaN(intId) || !Number.isInteger(intId)) {
        return NextResponse.json({ error: "Invalid integer ID for quizType" }, { status: 400 });
      }

      const quizType = await prisma.quizType.findUnique({
        where: { id: intId },
      });
      if (!quizType) {
        return NextResponse.json({ error: "Quiz type record not found" }, { status: 404 });
      }

      if (quizType.siteId && quizType.siteId !== auth.siteId && auth.user?.globalRole !== "SUPERADMIN") {
        return NextResponse.json({ error: "Access denied to quiz type owned by another site" }, { status: 403 });
      }
      if (!quizType.siteId && auth.user?.globalRole !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unassigned global quiz types may only be updated by a SUPERADMIN" }, { status: 403 });
      }

      updatedEntity = await prisma.quizType.update({
        where: { id: quizType.id },
        data: updateData,
      });
    } else if (ownerType === "magazine") {
      const intId = Number(ownerId);
      if (isNaN(intId) || !Number.isInteger(intId)) {
        return NextResponse.json({ error: "Invalid integer ID for magazine" }, { status: 400 });
      }

      const magazine = await prisma.magazine.findUnique({
        where: { id: intId },
      });
      if (!magazine) {
        return NextResponse.json({ error: "Magazine record not found" }, { status: 404 });
      }

      if (magazine.siteId && magazine.siteId !== auth.siteId && auth.user?.globalRole !== "SUPERADMIN") {
        return NextResponse.json({ error: "Access denied to magazine owned by another site" }, { status: 403 });
      }
      if (!magazine.siteId && auth.user?.globalRole !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unassigned global magazines may only be updated by a SUPERADMIN" }, { status: 403 });
      }

      updatedEntity = await prisma.magazine.update({
        where: { id: magazine.id },
        data: updateData,
      });
    }

    // Log Audit action safely
    await logAction(auth.siteId, auth.user?.id, "SEO_UPDATE", {
      ownerType,
      ownerId,
      fieldsUpdated: Object.keys(updateData),
    }).catch(() => {});

    return NextResponse.json(apiSuccess({ ownerType, entity: updatedEntity }));
  } catch (err) {
    return handleApiError(err);
  }
}
