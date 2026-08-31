import { postRepository } from "@/repositories/post.repository";
import { BaseService } from "@/core/service";
import { EventBus } from "@/core/events";
import { NotFoundError } from "@/core/errors";
import { logAction } from "@/lib/audit";
import prisma from "@/lib/prisma";

export class PostService extends BaseService {
  constructor() {
    super(postRepository);
  }

  /**
   * Find or create a site-level "Others" category for uncategorized posts.
   */
  async getOrCreateOthersCategory(siteId) {
    const existing = await prisma.category.findFirst({
      where: { siteId, OR: [{ name: "Others" }, { slug: "others" }] },
    });
    if (existing) return existing;

    return prisma.category.create({
      data: {
        siteId,
        name: "Others",
        slug: "others",
      },
    });
  }

  async getPosts(siteId, options = {}) {
    const where = {};
    if (options.status) {
      where.status = options.status;
    }

    if (options.publicOnly) {
      where.status = "PUBLISHED";
      where.publishedAt = { lte: new Date() };
    }

    if (options.categoryId) {
      where.categories = { some: { id: options.categoryId } };
    }

    return this.getList(siteId, {
      where,
      orderBy: { createdAt: "desc" },
      include: {
        categories: true,
        tags: true,
        author: { select: { id: true, email: true } },
        featuredImage: true,
      },
    });
  }

  async getPostBySlug(siteId, slug) {
    const post = await postRepository.findBySlug(siteId, slug);
    if (!post) {
      throw new NotFoundError("Blog post");
    }
    return post;
  }

  async create(siteId, postData, userId = null, options = {}) {
    const { categoryIds, tagIds, ...data } = postData;

    const baseSlug =
      (data.slug && this.slugify(data.slug)) ||
      this.slugify(data.title || "new-post");
    const slug = await this.generateUniquePostSlug(siteId, baseSlug);

    let publishedAtVal = null;
    if (data.publishedAt) {
      publishedAtVal = new Date(data.publishedAt);
    } else if (data.status === "PUBLISHED") {
      publishedAtVal = new Date();
    }

    // Default to "Others" category if none selected
    let effectiveCategoryIds = categoryIds;
    if (!effectiveCategoryIds || effectiveCategoryIds.length === 0) {
      const others = await this.getOrCreateOthersCategory(siteId);
      effectiveCategoryIds = [others.id];
    }

    const relations = {};
    if (effectiveCategoryIds.length > 0) {
      relations.categories = {
        connect: effectiveCategoryIds.map((id) => ({ id })),
      };
    }
    if (tagIds && tagIds.length > 0) {
      relations.tags = { connect: tagIds.map((id) => ({ id })) };
    }

    let contentVal = null;
    let contentJsonVal = null;

    if (data.content !== undefined && data.content !== null) {
      if (typeof data.content === "object") {
        contentVal = data.content;
        contentJsonVal = JSON.stringify(data.content);
      } else if (typeof data.content === "string") {
        contentJsonVal = data.content;
        try {
          contentVal = JSON.parse(data.content);
        } catch {
          contentVal = null;
        }
      }
    }

    if (data.contentJson !== undefined && data.contentJson !== null) {
      contentJsonVal = typeof data.contentJson === "string"
        ? data.contentJson
        : JSON.stringify(data.contentJson);
    }

    const { content: _c, contentJson: _cj, authorId: rawAuthorId, featuredImageId: rawFeaturedImageId, ...cleanData } = data;

    if (cleanData.seoTitle && typeof cleanData.seoTitle === "string" && cleanData.seoTitle.length > 190) {
      cleanData.seoTitle = cleanData.seoTitle.slice(0, 187) + "...";
    }
    if (cleanData.seoDescription && typeof cleanData.seoDescription === "string") {
      let desc = cleanData.seoDescription.trim();
      if (desc.includes("<")) desc = desc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (desc.length > 190) desc = desc.slice(0, 187) + "...";
      cleanData.seoDescription = desc || null;
    }

    const authorId = (rawAuthorId && typeof rawAuthorId === "string" && rawAuthorId.trim() !== "")
      ? rawAuthorId
      : (userId || null);
    const featuredImageId = (rawFeaturedImageId && typeof rawFeaturedImageId === "string" && rawFeaturedImageId.trim() !== "")
      ? rawFeaturedImageId
      : null;

    const created = await this.repository.create(siteId, {
      ...cleanData,
      ...relations,
      slug,
      publishedAt: publishedAtVal,
      authorId,
      featuredImageId,
      content: contentVal,
      contentJson: contentJsonVal,
    });

    // Audit log
    if (userId) {
      try {
        await logAction(siteId, userId, "POST_CREATE", { id: created.id, title: created.title, status: created.status });
      } catch (e) { console.error("Audit log failed (post create):", e); }
    }

    if (
      created.status === "PUBLISHED" &&
      (!created.publishedAt || new Date(created.publishedAt) <= new Date())
    ) {
      EventBus.emit("post.published", { siteId, data: created });
    }

    return created;
  }

  async update(siteId, postId, postData, userId = null, options = {}) {
    const { categoryIds, tagIds, siteId: _, ...data } = postData;

    // Default to "Others" category if explicitly clearing categories
    let effectiveCategoryIds = categoryIds;
    if (effectiveCategoryIds !== undefined) {
      if (!effectiveCategoryIds || effectiveCategoryIds.length === 0) {
        const others = await this.getOrCreateOthersCategory(siteId);
        effectiveCategoryIds = [others.id];
      }
    }

    const relations = {};
    if (effectiveCategoryIds !== undefined) {
      relations.categories = {
        set: effectiveCategoryIds.map((id) => ({ id })),
      };
    }
    if (tagIds) {
      relations.tags = { set: tagIds.map((id) => ({ id })) };
    }

    const current = await this.repository.findUnique(siteId, postId);
    if (!current) {
      throw new NotFoundError("Blog post");
    }

    const wasPublished = current.status === "PUBLISHED";
    const willBePublished = data.status === "PUBLISHED";

    if (willBePublished && !current.publishedAt && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    let contentVal = undefined;
    let contentJsonVal = undefined;

    if (data.content !== undefined) {
      if (data.content === null) {
        contentVal = null;
      } else if (typeof data.content === "object") {
        contentVal = data.content;
        contentJsonVal = JSON.stringify(data.content);
      } else if (typeof data.content === "string") {
        contentJsonVal = data.content;
        try {
          contentVal = JSON.parse(data.content);
        } catch {
          contentVal = null;
        }
      }
    }

    if (data.contentJson !== undefined) {
      contentJsonVal = data.contentJson === null
        ? null
        : typeof data.contentJson === "string"
        ? data.contentJson
        : JSON.stringify(data.contentJson);
    }

    const { content: _c, contentJson: _cj, authorId: rawAuthorId, featuredImageId: rawFeaturedImageId, ...cleanData } = data;

    if (cleanData.seoTitle && typeof cleanData.seoTitle === "string" && cleanData.seoTitle.length > 190) {
      cleanData.seoTitle = cleanData.seoTitle.slice(0, 187) + "...";
    }
    if (cleanData.seoDescription && typeof cleanData.seoDescription === "string") {
      let desc = cleanData.seoDescription.trim();
      if (desc.includes("<")) desc = desc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (desc.length > 190) desc = desc.slice(0, 187) + "...";
      cleanData.seoDescription = desc || null;
    }

    const updatePayload = {
      ...cleanData,
      ...relations,
    };
    if (rawAuthorId !== undefined) {
      updatePayload.authorId = (rawAuthorId && typeof rawAuthorId === "string" && rawAuthorId.trim() !== "") ? rawAuthorId : null;
    }
    if (rawFeaturedImageId !== undefined) {
      updatePayload.featuredImageId = (rawFeaturedImageId && typeof rawFeaturedImageId === "string" && rawFeaturedImageId.trim() !== "") ? rawFeaturedImageId : null;
    }
    if (contentVal !== undefined) updatePayload.content = contentVal;
    if (contentJsonVal !== undefined) updatePayload.contentJson = contentJsonVal;

    const updated = await this.repository.update(siteId, postId, updatePayload);

    // Audit log
    if (userId) {
      try {
        await logAction(siteId, userId, "POST_UPDATE", { id: postId, title: updated.title, status: updated.status });
      } catch (e) { console.error("Audit log failed (post update):", e); }
    }

    if (
      !wasPublished &&
      willBePublished &&
      (!updated.publishedAt || new Date(updated.publishedAt) <= new Date())
    ) {
      EventBus.emit("post.published", { siteId, data: updated });
    }

    return updated;
  }

  slugify(text = "") {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  }

  async generateUniquePostSlug(siteId, baseSlug) {
    const cleanBase = (baseSlug || "post").slice(0, 45);
    let candidate = cleanBase;
    let i = 0;
    while (
      await prisma.post.findFirst({
        where: { siteId, slug: candidate },
      })
    ) {
      i += 1;
      candidate = `${cleanBase.slice(0, 40)}-${i}`;
    }
    return candidate;
  }

  async checkScheduledPosts() {
    const now = new Date();
    const posts = await prisma.post.findMany({
      where: {
        status: "DRAFT",
        publishedAt: { lte: now },
        deletedAt: null,
      },
    });

    console.log(
      `\u23f0 Checking scheduled posts... Found ${posts.length} draft posts to publish.`,
    );

    for (const post of posts) {
      console.log(`\ud83d\udce2 Publishing scheduled post: ${post.title}`);

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
        },
      });

      EventBus.emit("post.published", { siteId: post.siteId, data: post });

      await prisma.auditLog.create({
        data: {
          siteId: post.siteId,
          userId: post.authorId || "system",
          action: "POST_PUBLISHED_ALERT",
          meta: { postId: post.id },
        },
      });
    }
  }
}

export const postService = new PostService();
