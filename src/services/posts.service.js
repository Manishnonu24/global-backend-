/**
 * Posts service — fetches posts directly from the database using Prisma client
 * for the infinium frontend, with local fallback.
 */
import prisma from "@/lib/prisma";
import { posts as localPosts } from "@/data/posts";
import { mapPosts } from "@/mappers";
import { getDefaultSiteId } from "@/lib/siteResolver";

/**
 * Get posts directly from the database, falling back to local data if query fails or returns empty.
 * Returns posts in the infinium local format.
 * @returns {Array}
 */
export async function getPosts(options = {}) {
  try {
    const siteId = getDefaultSiteId();
    const categoryId = options.categoryId || undefined;
    const search = options.search || undefined;
    const pageVal = options.page;
    const limitVal = options.limit;

    const where = {
      siteId,
      status: "PUBLISHED",
      deletedAt: null,
      publishedAt: { lte: new Date() },
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { excerpt: { contains: search } },
              { contentJson: { contains: search } },
            ],
          }
        : {}),
    };

    let posts;
    let paginationInfo = null;

    if (pageVal || limitVal) {
      const page = parseInt(pageVal || "1", 10);
      const limit = parseInt(limitVal || "5", 10);
      const skip = (page - 1) * limit;

      const [totalPosts, paginatedPosts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: limit,
          skip,
          include: {
            categories: true,
            tags: true,
            author: { select: { id: true, email: true, name: true, bio: true } },
            featuredImage: true,
          },
        }),
      ]);

      posts = paginatedPosts;
      paginationInfo = {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      };
    } else {
      posts = await prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          categories: true,
          tags: true,
          author: { select: { id: true, email: true, name: true, bio: true } },
          featuredImage: true,
        },
      });
    }

    if (Array.isArray(posts) && posts.length > 0) {
      const mapped = mapPosts(posts);
      if (paginationInfo) {
        mapped.pagination = paginationInfo;
      }
      return mapped;
    }
  } catch (err) {
    console.warn(
      "Direct DB fetch for posts failed; falling back to local fallback data.",
      err.message,
    );
  }

  // Local fallback pagination mock
  let fallbackPosts = localPosts;
  if (options.search) {
    fallbackPosts = fallbackPosts.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(options.search.toLowerCase()) ||
        (p.snippet || p.excerpt || "").toLowerCase().includes(options.search.toLowerCase()),
    );
  }

  let paginated = fallbackPosts;
  let paginationInfo = null;

  if (options.page || options.limit) {
    const page = parseInt(options.page || "1", 10);
    const limit = parseInt(options.limit || "5", 10);
    paginated = fallbackPosts.slice((page - 1) * limit, page * limit);
    paginationInfo = {
      page,
      limit,
      totalPosts: fallbackPosts.length,
      totalPages: Math.ceil(fallbackPosts.length / limit),
    };
  }

  const mappedFallback = mapPosts(paginated);
  if (paginationInfo) {
    mappedFallback.pagination = paginationInfo;
  }
  return mappedFallback;
}
