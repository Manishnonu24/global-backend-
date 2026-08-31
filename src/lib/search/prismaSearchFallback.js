import prisma from "../prisma";

function proxyUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export async function searchContentFallback({ query, type, category, page = 1, perPage = 30 }) {
  const skip = (page - 1) * perPage;
  const take = parseInt(perPage, 10);
  
  const results = [];
  const typeCounts = {};

  try {
    const containsQuery = { contains: query };
    
    // 1. Search Posts (Blogs)
    if (!type || type === "post") {
      try {
        const posts = await prisma.post.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: containsQuery },
              { excerpt: containsQuery },
              { seoDescription: containsQuery },
            ],
          },
          include: { categories: true, tags: true, featuredImage: true },
          take: 20,
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
        });
        
        posts.forEach(post => {
          results.push({
            id: `post:${post.id}`,
            sourceId: post.id,
            type: "post",
            title: post.title,
            highlightedTitle: post.title,
            summary: post.excerpt || post.seoDescription || "",
            highlightedSummary: post.excerpt || post.seoDescription || "",
            url: `/blogs/${post.slug}`,
            imageUrl: post.featuredImage?.url ? proxyUrl(post.featuredImage.url) : (post.ogImage ? proxyUrl(post.ogImage) : ""),
            category: post.categories?.[0]?.name || "Blog",
            tags: post.tags?.map(t => t.name) || [],
            publishedAt: post.publishedAt ? Math.floor(new Date(post.publishedAt).getTime() / 1000) : null,
          });
        });
        if (posts.length > 0) typeCounts.post = posts.length;
      } catch (err) {
        console.error("Error searching posts:", err);
      }
    }

    // 2. Search Magazines (Publications)
    if (!type || type === "magazine") {
      try {
        const magazines = await prisma.magazine.findMany({
          where: {
            status: 1,
            OR: [
              { title: containsQuery },
              { description: containsQuery },
              { introduction: containsQuery },
              { tags: containsQuery },
              { category: containsQuery },
            ],
          },
          take: 20,
          orderBy: { date: 'desc' }
        });

        magazines.forEach(mag => {
          results.push({
            id: `magazine:${mag.id}`,
            sourceId: String(mag.id),
            type: "magazine",
            title: mag.title,
            highlightedTitle: mag.title,
            summary: mag.description ? mag.description.replace(/<[^>]*>?/gm, '').slice(0, 150) : "",
            highlightedSummary: mag.description ? mag.description.replace(/<[^>]*>?/gm, '').slice(0, 150) : "",
            url: `/publication/${mag.slug}`,
            imageUrl: mag.coverImage ? proxyUrl(mag.coverImage) : "",
            category: mag.category || "Publication",
            tags: mag.tags ? mag.tags.split(",").map(t => t.trim()) : [],
            publishedAt: mag.date ? Math.floor(new Date(mag.date).getTime() / 1000) : null,
          });
        });
        if (magazines.length > 0) typeCounts.magazine = magazines.length;
      } catch (err) {
        console.error("Error searching magazines:", err);
      }
    }

    // 3. Search Quiz Types
    if (!type || type === "quiz") {
      try {
        const quizTypes = await prisma.quizType.findMany({
          where: {
            isActive: true,
            OR: [
              { title: containsQuery },
              { description: containsQuery },
              { subtitle: containsQuery },
              { category: containsQuery },
            ],
          },
          take: 15,
          orderBy: { sortOrder: 'asc' }
        });

        quizTypes.forEach(qt => {
          results.push({
            id: `quiz:${qt.id}`,
            sourceId: String(qt.id),
            type: "quiz",
            title: qt.title,
            highlightedTitle: qt.title,
            summary: qt.description || qt.subtitle || "",
            highlightedSummary: qt.description || qt.subtitle || "",
            url: `/quizzes/${qt.slug}`,
            imageUrl: qt.imageUrl ? proxyUrl(qt.imageUrl) : "",
            category: qt.category || "Quiz",
            tags: [],
            publishedAt: Math.floor(new Date(qt.createdAt).getTime() / 1000),
          });
        });
        if (quizTypes.length > 0) typeCounts.quiz = quizTypes.length;
      } catch (err) {
        console.error("Error searching quiz types:", err);
      }
    }

    // 4. Search Pages
    if (!type || type === "page") {
      try {
        const pages = await prisma.page.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: containsQuery },
              { seoDescription: containsQuery },
            ],
          },
          take: 10,
          orderBy: { updatedAt: 'desc' }
        });

        pages.forEach(pg => {
          results.push({
            id: `page:${pg.id}`,
            sourceId: pg.id,
            type: "page",
            title: pg.title,
            highlightedTitle: pg.title,
            summary: pg.seoDescription || "",
            highlightedSummary: pg.seoDescription || "",
            url: pg.slug === "home" ? "/" : `/${pg.slug}`,
            imageUrl: pg.ogImage ? proxyUrl(pg.ogImage) : "",
            category: "Page",
            tags: [],
            publishedAt: pg.publishedAt ? Math.floor(new Date(pg.publishedAt).getTime() / 1000) : null,
          });
        });
        if (pages.length > 0) typeCounts.page = pages.length;
      } catch (err) {
        console.error("Error searching pages:", err);
      }
    }

    // 5. Search Services
    if (!type || type === "service") {
      try {
        const services = await prisma.service.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: containsQuery },
              { description: containsQuery },
            ],
          },
          include: { featuredImage: true },
          take: 10,
        });

        services.forEach(srv => {
          results.push({
            id: `service:${srv.id}`,
            sourceId: srv.id,
            type: "service",
            title: srv.title,
            highlightedTitle: srv.title,
            summary: srv.description || "",
            highlightedSummary: srv.description || "",
            url: `/services/${srv.slug || srv.id}`,
            imageUrl: srv.featuredImage?.url ? proxyUrl(srv.featuredImage.url) : "",
            category: "Service",
            tags: [],
            publishedAt: Math.floor(new Date(srv.createdAt).getTime() / 1000),
          });
        });
        if (services.length > 0) typeCounts.service = services.length;
      } catch (err) {
        console.error("Error searching services:", err);
      }
    }

    // Build facet structure for tabs
    const facets = {
      types: Object.entries(typeCounts)
        .filter(([_, count]) => count > 0)
        .map(([value, count]) => ({ value, count })),
      categories: [],
    };

    // Filter by category if specified
    const filteredHits = category
      ? results.filter(r => r.category.toLowerCase() === category.toLowerCase())
      : results;

    const pagedHits = filteredHits.slice(skip, skip + take);

    return {
      hits: pagedHits,
      found: filteredHits.length,
      page,
      perPage: take,
      totalPages: Math.ceil(filteredHits.length / take) || 1,
      facets,
    };
  } catch (error) {
    console.error("[SearchFallback] Prisma search fallback failed:", error);
    return { hits: [], found: 0, page: 1, perPage: take, totalPages: 0, facets: { types: [], categories: [] } };
  }
}
