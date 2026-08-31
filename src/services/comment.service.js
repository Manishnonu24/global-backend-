import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";
import { getDefaultSiteId } from "@/lib/siteResolver";

const VALID_TARGET_TYPES = ["post", "magazine"];

export const commentService = {
  /**
   * CRM Moderation: Fetch comments for a site with optional status and target filtering.
   */
  async getComments(siteId, status = null, targetId = null, targetType = null) {
    const where = {};
    if (siteId) {
      where.siteId = siteId;
    }

    if (status) {
      where.status = status;
    }

    if (targetType === "post" && targetId) {
      where.postId = targetId;
    } else if (targetType === "magazine" && targetId) {
      const magIdInt = parseInt(targetId, 10);
      where.magazineId = isNaN(magIdInt) ? -1 : magIdInt;
    } else if (targetId) {
      // General target search
      const magIdInt = parseInt(targetId, 10);
      where.OR = [
        { postId: targetId },
        { post: { slug: targetId } },
        ...(isNaN(magIdInt)
          ? [{ magazine: { slug: targetId } }, { magazine: { magazineId: targetId } }]
          : [{ magazineId: magIdInt }, { magazine: { slug: targetId } }]),
      ];
    }

    const list = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          select: { id: true, title: true, slug: true },
        },
        magazine: {
          select: { id: true, title: true, slug: true, magazineId: true },
        },
      },
    });

    return list.map((item) => ({
      ...item,
      targetType: item.magazineId ? "magazine" : "post",
      targetTitle: item.post?.title || item.magazine?.title || "N/A",
      post: item.post || null,
      magazine: item.magazine || null,
    }));
  },

  /**
   * Public API: Fetch approved comments for a specific post or magazine.
   * Returns ONLY safe public fields (id, authorName, content, createdAt).
   * When targetType is explicitly supplied, validates it and rejects unknown values.
   */
  async getPublicComments(siteId, { targetType, targetId }) {
    if (!targetId) {
      return [];
    }

    try {
      // Validate explicit targetType — return empty if unknown
      if (targetType && !VALID_TARGET_TYPES.includes(targetType)) {
        return [];
      }

      const where = { status: "approved" };
      if (siteId) {
        where.siteId = siteId;
      }

      if (targetType === "magazine") {
        const magazine = await this._resolveMagazine(targetId, siteId);
        if (!magazine) return [];
        where.magazineId = magazine.id;
      } else if (targetType === "post") {
        const post = await this._resolvePost(targetId, siteId);
        if (!post) return [];
        where.postId = post.id;
      } else {
        // Auto-detect when targetType is absent (backward compat for existing callers)
        const post = await this._resolvePost(targetId, siteId);
        if (post) {
          where.postId = post.id;
        } else {
          const magazine = await this._resolveMagazine(targetId, siteId);
          if (magazine) {
            where.magazineId = magazine.id;
          } else {
            return [];
          }
        }
      }

      const comments = await prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
        },
      });

      return comments || [];
    } catch (err) {
      console.warn("[commentService] Error loading public comments:", err.message);
      return [];
    }
  },

  /**
   * Submit a new comment (always pending status, derived author metadata).
   * authorName and authorEmail must be supplied by the caller — no fake fallbacks.
   */
  async createComment(siteId, data) {
    const { targetType, targetId, postId, magazineId, authorName, authorEmail, content } = data;

    const trimmedContent = (content || "").trim();
    if (!trimmedContent) {
      throw new ValidationError({ field: "content", message: "Comment content cannot be empty" });
    }
    if (trimmedContent.length > 2000) {
      throw new ValidationError({ field: "content", message: "Comment exceeds maximum length of 2000 characters" });
    }

    if (!authorEmail || !authorEmail.trim()) {
      throw new ValidationError({ field: "authorEmail", message: "Author email is required to submit a comment" });
    }

    let finalPostId = null;
    let finalMagazineId = null;

    // Determine effective targetType — allow implicit magazine from magazineId field, default to post
    const resolvedTargetType = targetType || (magazineId ? "magazine" : "post");
    const rawTargetId = targetId || postId || magazineId;

    // Reject unknown explicit targetType values
    if (targetType && !VALID_TARGET_TYPES.includes(targetType)) {
      throw new ValidationError({ field: "targetType", message: `targetType must be one of: ${VALID_TARGET_TYPES.join(", ")}` });
    }

    if (!rawTargetId) {
      throw new ValidationError({ field: "targetId", message: "Target ID or slug is required" });
    }

    if (resolvedTargetType === "magazine") {
      const magazine = await this._resolveMagazine(rawTargetId, siteId);
      if (!magazine) {
        throw new NotFoundError("Publication magazine");
      }
      finalMagazineId = magazine.id;
    } else {
      const post = await this._resolvePost(rawTargetId, siteId);
      if (!post) {
        throw new NotFoundError("Blog post");
      }
      finalPostId = post.id;
    }

    const created = await prisma.comment.create({
      data: {
        siteId,
        postId: finalPostId,
        magazineId: finalMagazineId,
        authorName: (authorName || "").trim() || authorEmail.split("@")[0],
        authorEmail: authorEmail.trim(),
        content: trimmedContent,
        status: "pending",
      },
    });

    return {
      id: created.id,
      status: created.status,
      message: "Comment submitted successfully and is pending approval.",
    };
  },

  /**
   * Update comment moderation status (CRM only).
   * siteId is always required to prevent cross-site moderation.
   */
  async updateCommentStatus(siteId, id, status) {
    const allowedStatuses = ["pending", "approved", "spam"];
    if (!allowedStatuses.includes(status)) {
      throw new ValidationError({ field: "status", message: `Status must be one of: ${allowedStatuses.join(", ")}` });
    }

    // Always include siteId in the mutation constraint to enforce site isolation
    const where = { id };
    if (siteId) {
      where.siteId = siteId;
    }

    return prisma.comment.update({
      where,
      data: { status },
    });
  },

  /**
   * Delete comment (CRM only).
   * siteId is always required to prevent cross-site deletion.
   */
  async deleteComment(siteId, id) {
    const where = { id };
    if (siteId) {
      where.siteId = siteId;
    }

    return prisma.comment.delete({
      where,
    });
  },

  /**
   * Helper: Resolve Post record by ID or slug.
   */
  async _resolvePost(targetId, siteId) {
    const where = {
      OR: [{ id: String(targetId) }, { slug: String(targetId) }],
    };
    if (siteId) {
      where.siteId = siteId;
    }
    return prisma.post.findFirst({ where });
  },

  /**
   * Helper: Resolve Magazine record by numeric ID, magazineId string, or slug.
   * Supports legacy magazines where siteId IS NULL for the canonical default site.
   * Non-default tenant sites do NOT inherit NULL-siteId magazines.
   */
  async _resolveMagazine(targetId, siteId) {
    const targetStr = String(targetId);
    const magIdInt = parseInt(targetStr, 10);

    const OR = [
      { slug: targetStr },
      { magazineId: targetStr },
    ];
    if (!isNaN(magIdInt)) {
      OR.push({ id: magIdInt });
    }

    const defaultSiteId = getDefaultSiteId();
    const isDefaultSite = !siteId || siteId === defaultSiteId;

    if (isDefaultSite) {
      // For the canonical site: resolve magazines belonging to this site OR legacy NULL-siteId magazines
      return prisma.magazine.findFirst({
        where: {
          OR: OR.flatMap((condition) => [
            { ...condition, siteId },
            ...(siteId ? [{ ...condition, siteId: null }] : [{ ...condition }]),
          ]),
        },
      });
    } else {
      // For non-default tenants: only resolve magazines explicitly belonging to their site
      return prisma.magazine.findFirst({
        where: {
          OR,
          siteId,
        },
      });
    }
  },
};
