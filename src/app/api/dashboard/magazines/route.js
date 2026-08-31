import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { getDefaultSiteId } from "@/lib/siteResolver";
import { uploadMagazineImageFile } from "../../../../../utils/s3Utility";
import { getRequestId } from "@/lib/observability/requestContext";

// Helper to register uploaded images in the global Media model
async function registerUploadedImageInMedia(siteId, imageUrl, fileName) {
  if (!imageUrl) return;
  const fileExtension = fileName ? (fileName.split(".").pop() || "png") : "png";
  let publicId = imageUrl;
  
  if (imageUrl.includes("key=")) {
    publicId = imageUrl.split("key=")[1];
  } else if (imageUrl.includes("cloudinary.com")) {
    const parts = imageUrl.split("/");
    publicId = parts.slice(parts.indexOf("upload") + 2).join("/");
    publicId = publicId.split(".")[0];
  }

  try {
    await prisma.media.create({
      data: {
        siteId,
        fileName: fileName || "magazine_image",
        originalName: fileName || "magazine_image",
        publicId: publicId,
        url: imageUrl,
        secureUrl: imageUrl,
        mimeType: "image/png", // generic fallback
        extension: fileExtension,
        isImage: true,
      }
    });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Failed to register image in Media system:");
  }
}

export async function GET(request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const magazines = await prisma.magazine.findMany({
      where: search ? {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { tags: { contains: search } },
          { category: { contains: search } }
        ]
      } : {},
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, magazines });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Error fetching magazines:");
    return NextResponse.json({ error: "Failed to fetch magazines." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const magazine_id = formData.get("magazine_id");
    const magazine_title = formData.get("magazine_title");
    const magazine_description = formData.get("magazine_description");
    const magazine_introduction = formData.get("magazine_introduction");
    const magazine_tags = formData.get("magazine_tags");
    const magazine_cover_image = formData.get("magazine_cover_image"); // File
    const magazine_back_image = formData.get("magazine_back_image"); // File
    const magazine_spine_image = formData.get("magazine_spine_image"); // File
    const magazine_link = formData.get("magazine_link");
    const magazine_date = formData.get("magazine_date");
    const magazine_category = formData.get("magazine_category");
    const MagCloudLink = formData.get("MagCloudLink");
    const magazine_slug = formData.get("magazine_slug");
    const status = parseInt(formData.get("status") || "1");

    let publisherSocials = null;
    const publisherSocialsStr = formData.get("publisherSocials");
    if (publisherSocialsStr) {
      try {
        publisherSocials = JSON.parse(publisherSocialsStr);
      } catch (e) {
        const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
        Sentry.captureException(e, { tags: { requestId: _reqId } });
        logger.error({ err: e, requestId: _reqId }, "Failed to parse publisherSocials:");
      }
    }

    let insideIssue = null;
    const insideIssueStr = formData.get("insideIssue");
    if (insideIssueStr) {
      try {
        insideIssue = JSON.parse(insideIssueStr);
      } catch (e) {
        console.error("Failed to parse insideIssue:", e);
      }
    }

    if (!magazine_title || !magazine_slug || !magazine_date) {
      return NextResponse.json({ error: "Title, slug, and date are required." }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.magazine.findUnique({
      where: { slug: magazine_slug },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already exists. Please choose a different title." }, { status: 400 });
    }

    // Resolve siteId
    const site = await getSiteForUser(user);
    const siteId = site?.id || getDefaultSiteId();

    // Handle cover image upload
    let imageUrl = "";
    if (magazine_cover_image) {
      const coverUrl = await uploadMagazineImageFile(siteId, magazine_cover_image, "magazines");
      if (coverUrl) {
        imageUrl = coverUrl;
        if (typeof magazine_cover_image !== "string") {
          await registerUploadedImageInMedia(siteId, imageUrl, magazine_cover_image.name);
        }
      }
    }

    // Handle back image upload
    let backImageUrl = "";
    if (magazine_back_image) {
      const backUrl = await uploadMagazineImageFile(siteId, magazine_back_image, "magazines");
      if (backUrl) {
        backImageUrl = backUrl;
        if (typeof magazine_back_image !== "string") {
          await registerUploadedImageInMedia(siteId, backImageUrl, magazine_back_image.name);
        }
      }
    }

    // Handle spine image upload
    let spineImageUrl = "";
    if (magazine_spine_image) {
      const spineUrl = await uploadMagazineImageFile(siteId, magazine_spine_image, "magazines");
      if (spineUrl) {
        spineImageUrl = spineUrl;
        if (typeof magazine_spine_image !== "string") {
          await registerUploadedImageInMedia(siteId, spineImageUrl, magazine_spine_image.name);
        }
      }
    }

    const dataToCreate = {
      magazineId: magazine_id || "",
      title: magazine_title,
      description: magazine_description || "",
      introduction: magazine_introduction || "",
      backImage: backImageUrl || "",
      spineImage: spineImageUrl || "",
      tags: magazine_tags || "",
      coverImage: imageUrl,
      link: magazine_link || "",
      date: new Date(magazine_date),
      category: magazine_category || "",
      magCloudLink: MagCloudLink || "",
      slug: magazine_slug,
      status,
      publisherSocials,
    };
    if (insideIssue) {
      dataToCreate.insideIssue = insideIssue;
    }

    let magazine;
    try {
      magazine = await prisma.magazine.create({ data: dataToCreate });
    } catch (createErr) {
      if (createErr.message?.includes("insideIssue")) {
        delete dataToCreate.insideIssue;
        magazine = await prisma.magazine.create({ data: dataToCreate });
      } else {
        throw createErr;
      }
    }

    if (magazine.status === 1) {
      const { queueUpsertContent } = await import("@/lib/queues/searchQueue");
      await queueUpsertContent("magazine", magazine.id.toString());
    }

    return NextResponse.json({ success: true, magazine });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Error creating magazine:");
    return NextResponse.json({ error: "Failed to create magazine." }, { status: 500 });
  }
}
