import { uploadToS3, deleteFromS3, getObjectFromS3, isS3Configured, storeMediaFile } from "../../utils/s3Utility";
import sharp from "sharp";
import { mediaRepository } from "@/repositories/media.repository";
import { mediaFolderRepository } from "@/repositories/mediaFolder.repository";
import { settingsService } from "@/services/settings.service";
import { BaseService } from "@/core/service";
import { NotFoundError, ValidationError } from "@/core/errors";
import { logAction } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { getDefaultSiteId } from "@/lib/siteResolver";

export class MediaService extends BaseService {
  constructor() {
    super(mediaRepository);
  }

  async uploadMedia(siteId, buffer, fileName, mimeType, folderId = null) {
    let targetSiteId = siteId || getDefaultSiteId();
    const siteObj = await prisma.site.findUnique({ where: { id: targetSiteId } });
    if (!siteObj) {
      const fallbackSite = await prisma.site.findFirst();
      if (fallbackSite) {
        targetSiteId = fallbackSite.id;
      }
    }

    let folderIdVal = (folderId === "root" || folderId === "null" || folderId === "undefined" || folderId === "none" || !folderId) ? null : folderId;

    if (folderIdVal) {
      const folder = await prisma.mediafolder.findFirst({
        where: { id: folderIdVal, siteId: targetSiteId, deletedAt: null }
      });
      if (!folder) {
        folderIdVal = null;
      }
    }

    const fileExtension = fileName.split(".").pop() || "";
    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    let finalFileName = fileName;
    let finalFileExtension = fileExtension;

    let performanceConfig = {};
    try {
      performanceConfig = await settingsService.getSettingsField(targetSiteId, "performanceConfig") || {};
    } catch (e) {
      console.warn("Failed to retrieve performance config in uploadMedia:", e.message);
    }

    const shouldCompress = mimeType.startsWith("image/") && 
      mimeType !== "image/gif" && 
      mimeType !== "image/svg+xml" && 
      (performanceConfig.compressImagesOnUpload ?? true);

    if (shouldCompress) {
      try {
        const compressedBuffer = await sharp(buffer)
          .rotate()
          .toColorspace("srgb")
          .webp({ quality: 80 })
          .toBuffer();
        
        finalBuffer = compressedBuffer;
        finalMimeType = "image/webp";
        finalFileExtension = "webp";
        finalFileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
      } catch (err) {
        console.warn("Failed to compress image on upload:", err.message);
      }
    }

    const key = `site-${targetSiteId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${finalFileExtension}`;

    const directS3Url = await storeMediaFile(targetSiteId, key, {
      originalname: finalFileName,
      buffer: finalBuffer,
      mimetype: finalMimeType,
    });

    let width = null;
    let height = null;
    if (finalMimeType.startsWith("image/")) {
      try {
        const metadata = await sharp(finalBuffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch (err) {
        console.warn("Failed to get image metadata via sharp:", err.message);
      }
    }

    const isDocument = !finalMimeType.startsWith("image/") && !finalMimeType.startsWith("video/");

    /*
     * URL strategy:
     *   - Images / Videos: serve via internal /api/media/view proxy (supports auth,
     *     range requests, and private bucket access).
     *   - Documents (PDFs, etc.): use the direct public S3 URL so that browser-side
     *     clients (e.g. DearFlip / PDF.js) can fetch them with native HTTP range
     *     requests without going through the Node.js proxy, which would buffer the
     *     entire file into memory and misparse the S3 key causing NoSuchKey errors.
     */
    const proxyUrl = `/api/media/view?key=${key}`;
    const storedUrl = directS3Url || proxyUrl;
    const storedSecureUrl = storedUrl;

    const media = await mediaRepository.create(targetSiteId, {
      fileName: finalFileName,
      originalName: fileName,
      publicId: key,
      url: storedUrl,
      secureUrl: storedSecureUrl,
      mimeType: finalMimeType,
      extension: finalFileExtension,
      size: finalBuffer.length,
      width,
      height,
      folderId: folderIdVal,
      isImage: finalMimeType.startsWith("image/"),
      isVideo: finalMimeType.startsWith("video/"),
      isDocument,
    });

    // Audit log (no userId available at service level for uploads)
    try { await logAction(targetSiteId, null, "MEDIA_UPLOAD", { fileName: media.fileName, mimeType: media.mimeType, size: media.size }); } catch (e) { console.error("Audit log failed (media upload):", e); }

    return media;
  }

  async deleteMedia(siteId, mediaId, userId = null) {
    const media = await prisma.media.findFirst({
      where: { siteId, id: mediaId },
    });
    if (!media) {
      return { success: true };
    }

    if (media.publicId) {
      try {
        await deleteFromS3(media.publicId);
      } catch (err) {
        console.warn("S3 file deletion warning:", err.message);
      }
    }

    try {
      await prisma.media.delete({
        where: { id: mediaId },
      });
    } catch {
      await prisma.media.update({
        where: { id: mediaId },
        data: { deletedAt: new Date() },
      }).catch(() => {});
    }

    try { await logAction(siteId, userId, "MEDIA_DELETE", { mediaId, fileName: media.fileName }); } catch (e) { console.error("Audit log failed (media delete):", e); }
    return { success: true };
  }

  async _cascadeMediaUrlUpdate(siteId, oldUrl, oldSecureUrl, newUrl, newSecureUrl) {
    if (!oldUrl && !oldSecureUrl) return;
    if (oldUrl === newUrl && oldSecureUrl === newSecureUrl) return;

    const urlsToFind = [oldUrl, oldSecureUrl].filter(Boolean);
    if (urlsToFind.length === 0) return;

    // Update TeamMember table
    await prisma.teammember.updateMany({
      where: {
        siteId,
        photo: { in: urlsToFind },
      },
      data: {
        photo: newSecureUrl || newUrl,
      },
    });

    // Update Testimonial table
    await prisma.testimonial.updateMany({
      where: {
        siteId,
        clientImage: { in: urlsToFind },
      },
      data: {
        clientImage: newSecureUrl || newUrl,
      },
    });
  }

  async replaceMedia(siteId, mediaId, buffer, fileName, mimeType) {
    const media = await mediaRepository.findUnique(siteId, mediaId);
    if (!media) {
      throw new NotFoundError("Media");
    }
    const oldUrl = media.url;
    const oldSecureUrl = media.secureUrl;

    try {
      await deleteFromS3(media.publicId);
    } catch (err) {
      console.warn("S3 replace deletion warning:", err.message);
    }

    const fileExtension = fileName.split(".").pop() || "";
    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    let finalFileName = fileName;
    let finalFileExtension = fileExtension;

    let performanceConfig = {};
    try {
      performanceConfig = await settingsService.getSettingsField(siteId, "performanceConfig") || {};
    } catch (e) {
      console.warn("Failed to retrieve performance config in replaceMedia:", e.message);
    }

    const shouldCompress = mimeType.startsWith("image/") && 
      mimeType !== "image/gif" && 
      mimeType !== "image/svg+xml" && 
      (performanceConfig.compressImagesOnUpload ?? true);

    if (shouldCompress) {
      try {
        const compressedBuffer = await sharp(buffer)
          .rotate()
          .toColorspace("srgb")
          .webp({ quality: 80 })
          .toBuffer();
        
        finalBuffer = compressedBuffer;
        finalMimeType = "image/webp";
        finalFileExtension = "webp";
        finalFileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
      } catch (err) {
        console.warn("Failed to compress image on replace:", err.message);
      }
    }

    const key = `site-${siteId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${finalFileExtension}`;

    const storedUrl = await storeMediaFile(siteId, key, {
      originalname: finalFileName,
      buffer: finalBuffer,
      mimetype: finalMimeType,
    });

    let width = null;
    let height = null;
    if (finalMimeType.startsWith("image/")) {
      try {
        const metadata = await sharp(finalBuffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch (err) {
        console.warn("Failed to get image metadata via sharp:", err.message);
      }
    }

    const updated = await mediaRepository.update(siteId, mediaId, {
      fileName: finalFileName,
      originalName: fileName,
      publicId: key,
      url: storedUrl || `/api/media/view?key=${key}`,
      secureUrl: storedUrl || `/api/media/view?key=${key}`,
      mimeType: finalMimeType,
      extension: finalFileExtension,
      size: finalBuffer.length,
      width,
      height,
      isImage: finalMimeType.startsWith("image/"),
      isVideo: finalMimeType.startsWith("video/"),
      isDocument: !finalMimeType.startsWith("image/") && !finalMimeType.startsWith("video/"),
    });

    await this._cascadeMediaUrlUpdate(siteId, oldUrl, oldSecureUrl, updated.url, updated.secureUrl);
    try { await logAction(siteId, null, "MEDIA_REPLACE", { mediaId, fileName: updated.fileName }); } catch (e) { console.error("Audit log failed (media replace):", e); }

    return updated;
  }

  async renameMedia(siteId, mediaId, newName, altText, folderId = undefined) {
    const media = await mediaRepository.findUnique(siteId, mediaId);
    if (!media) {
      throw new NotFoundError("Media");
    }
    const oldUrl = media.url;
    const oldSecureUrl = media.secureUrl;

    const updateData = {};
    if (newName !== undefined && newName.trim() !== "") updateData.fileName = newName.trim();
    if (altText !== undefined) updateData.altText = altText;
    if (folderId !== undefined) {
      updateData.folderId = (folderId === "root" || folderId === "null" || !folderId) ? null : folderId;
    }

    const updated = await mediaRepository.update(siteId, mediaId, updateData);

    await this._cascadeMediaUrlUpdate(siteId, oldUrl, oldSecureUrl, updated.url, updated.secureUrl);
    try { await logAction(siteId, null, "MEDIA_RENAME", { mediaId, newName }); } catch (e) { console.error("Audit log failed (media rename):", e); }

    return updated;
  }

  async compressImage(siteId, mediaId) {
    const media = await mediaRepository.findUnique(siteId, mediaId);
    if (!media) {
      throw new NotFoundError("Media");
    }

    if (!media.isImage) {
      throw new ValidationError("Only image files can be compressed");
    }

    let buffer;
    const isCloudinary = media.url && media.url.includes("res.cloudinary.com");
    if (!isCloudinary && media.publicId) {
      try {
        const s3Obj = await getObjectFromS3(media.publicId);
        buffer = s3Obj.body;
      } catch (s3Err) {
        console.warn("Failed to get object from S3 directly, falling back to fetch:", s3Err.message);
        const res = await fetch(media.url);
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const res = await fetch(media.url);
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const compressedBuffer = await sharp(buffer)
      .rotate()
      .toColorspace("srgb")
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = media.fileName.replace(/\.[^/.]+$/, "") + ".webp";
    const key = `site-${siteId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

    const url = await storeMediaFile(siteId, key, {
      originalname: fileName,
      buffer: compressedBuffer,
      mimetype: "image/webp",
    });

    try {
      await deleteFromS3(media.publicId);
    } catch { }

    let width = null;
    let height = null;
    try {
      const metadata = await sharp(compressedBuffer).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch (err) {
      console.warn("Failed to get compressed image metadata:", err.message);
    }

    const updated = await mediaRepository.update(siteId, mediaId, {
      fileName,
      publicId: key,
      url: url || `/api/media/view?key=${key}`,
      secureUrl: url || `/api/media/view?key=${key}`,
      mimeType: "image/webp",
      extension: "webp",
      size: compressedBuffer.length,
      width,
      height,
    });

    return updated;
  }

  // --- Folder Management ---
  async getFolders(siteId, parentId = null) {
    return mediaFolderRepository.findSubfolders(siteId, parentId);
  }

  async createFolder(siteId, name, parentId = null) {
    const parentIdVal = (parentId === "root" || parentId === "null" || !parentId) ? null : parentId;
    if (parentIdVal) {
      const parentFolder = await mediaFolderRepository.findUnique(siteId, parentIdVal);
      if (!parentFolder) {
        throw new ValidationError("Parent folder not found");
      }
    }
    const folder = await mediaFolderRepository.create(siteId, {
      name,
      parentId: parentIdVal,
    });
    try { await logAction(siteId, null, "MEDIA_FOLDER_CREATE", { name, parentId: parentIdVal }); } catch (e) { console.error("Audit log failed (folder create):", e); }
    return folder;
  }

  async renameFolder(siteId, folderId, newName) {
    const folder = await mediaFolderRepository.findUnique(siteId, folderId);
    if (!folder) {
      throw new NotFoundError("Folder");
    }
    const updated = await mediaFolderRepository.update(siteId, folderId, { name: newName });
    try { await logAction(siteId, null, "MEDIA_FOLDER_RENAME", { folderId, newName }); } catch (e) { console.error("Audit log failed (folder rename):", e); }
    return updated;
  }

  async _getAllSubfolderIds(siteId, folderId) {
    const ids = [];
    const queue = [folderId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await prisma.mediafolder.findMany({
        where: { siteId, parentId: currentId },
        select: { id: true }
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
    return ids;
  }

  async deleteFolder(siteId, folderId) {
    const folder = await mediaFolderRepository.findUnique(siteId, folderId);
    if (!folder) {
      throw new NotFoundError("Folder");
    }

    const subfolderIds = await this._getAllSubfolderIds(siteId, folderId);
    const allFolderIds = [folderId, ...subfolderIds];

    // 1. Find all media items inside this folder and all nested folders
    const mediaItems = await prisma.media.findMany({
      where: { siteId, folderId: { in: allFolderIds } },
      select: { id: true, publicId: true }
    });

    // 2. Delete all those files from S3
    for (const item of mediaItems) {
      try {
        await deleteFromS3(item.publicId);
      } catch (err) {
        console.warn("S3 file deletion warning during cascade:", err.message);
      }
    }

    // 3. Delete database records in cascade order
    await prisma.$transaction([
      prisma.media.deleteMany({
        where: { siteId, folderId: { in: allFolderIds } }
      }),
      prisma.mediafolder.deleteMany({
        where: { siteId, id: { in: subfolderIds } }
      }),
      prisma.mediafolder.delete({
        where: { id: folderId, siteId }
      })
    ]);
    try { await logAction(siteId, null, "MEDIA_FOLDER_DELETE", { folderId, name: folder.name, filesDeleted: mediaItems.length }); } catch (e) { console.error("Audit log failed (folder delete):", e); }

    return { success: true };
  }
}

export const mediaService = new MediaService();

