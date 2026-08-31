import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { queueUpsertContent, queueDeleteContent } from "@/lib/queues/searchQueue";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { getDefaultSiteId } from "@/lib/siteResolver";
import { uploadMagazineImageFile } from "../../../../../../utils/s3Utility";
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

export async function GET(request, context) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const magazine = await prisma.magazine.findUnique({
      where: { slug },
    });

    if (!magazine) {
      return NextResponse.json({ error: "Magazine not found" }, { status: 404 });
    }

    return NextResponse.json(magazine);
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Error fetching magazine:");
    return NextResponse.json({ error: "Failed to fetch magazine." }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const existing = await prisma.magazine.findUnique({
      where: { slug },
    });

    if (!existing) {
      return NextResponse.json({ error: "Magazine not found" }, { status: 404 });
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
    const socialsRaw = formData.get("publisherSocials");
    if (socialsRaw) {
      try {
        publisherSocials = JSON.parse(socialsRaw);
      } catch (e) {
        const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
        Sentry.captureException(e, { tags: { requestId: _reqId } });
        logger.error({ err: e, requestId: _reqId }, "Failed to parse publisherSocials:");
      }
    }

    let insideIssue = existing.insideIssue;
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

    // Check slug uniqueness if changed
    if (magazine_slug !== slug) {
      const exists = await prisma.magazine.findUnique({
        where: { slug: magazine_slug },
      });
      if (exists) {
        return NextResponse.json({ error: "Slug already exists. Please choose a different title." }, { status: 400 });
      }
    }

    // Resolve siteId
    const site = await getSiteForUser(user);
    const siteId = site?.id || getDefaultSiteId();

    // Handle uploads — retain existing if no new file provided
    let imageUrl = existing.coverImage;
    if (magazine_cover_image) {
      const coverUrl = await uploadMagazineImageFile(siteId, magazine_cover_image, "magazines");
      if (coverUrl) {
        imageUrl = coverUrl;
        if (typeof magazine_cover_image !== "string") {
          await registerUploadedImageInMedia(siteId, imageUrl, magazine_cover_image.name);
        }
      }
    }

    let backImageUrl = existing.backImage;
    if (magazine_back_image) {
      const backUrl = await uploadMagazineImageFile(siteId, magazine_back_image, "magazines");
      if (backUrl) {
        backImageUrl = backUrl;
        if (typeof magazine_back_image !== "string") {
          await registerUploadedImageInMedia(siteId, backImageUrl, magazine_back_image.name);
        }
      }
    }

    let spineImageUrl = existing.spineImage;
    if (magazine_spine_image) {
      const spineUrl = await uploadMagazineImageFile(siteId, magazine_spine_image, "magazines");
      if (spineUrl) {
        spineImageUrl = spineUrl;
        if (typeof magazine_spine_image !== "string") {
          await registerUploadedImageInMedia(siteId, spineImageUrl, magazine_spine_image.name);
        }
      }
    }

    // Update in Prisma
    const dataToUpdate = {
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
      dataToUpdate.insideIssue = insideIssue;
    }

    let updated;
    try {
      updated = await prisma.magazine.update({
        where: { slug },
        data: dataToUpdate,
      });
    } catch (updateErr) {
      if (updateErr.message?.includes("insideIssue")) {
        delete dataToUpdate.insideIssue;
        updated = await prisma.magazine.update({
          where: { slug },
          data: dataToUpdate,
        });
      } else {
        throw updateErr;
      }
    }

    if (updated.status === 1) {
      await queueUpsertContent("magazine", updated.id.toString());
    } else {
      await queueDeleteContent("magazine", updated.id.toString());
    }

    return NextResponse.json({ success: true, magazine: updated });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Error updating magazine:");
    return NextResponse.json({ error: "Failed to update magazine." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const existing = await prisma.magazine.findUnique({
      where: { slug },
    });

    if (!existing) {
      return NextResponse.json({ error: "Magazine not found" }, { status: 404 });
    }

    await prisma.magazine.delete({
      where: { slug },
    });

    await queueDeleteContent("magazine", existing.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Error deleting magazine:");
    return NextResponse.json({ error: "Failed to delete magazine." }, { status: 500 });
  }
}
