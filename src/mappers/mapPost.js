/**
 * Map a CMS post into the infinium local post format.
 * This converts the CMS response shape into the exact format
 * expected by the existing UI components.
 */
export function mapPost(post) {
  if (!post) return null;

  return {
    id: post.id || post._id || null,
    slug: post.slug,
    title: post.title,
    category: post.categories?.[0]?.name || "MCA & Lending",
    categorySlug: post.categories?.[0]?.slug || "mca-lending",
    author: post.author?.name || post.author?.email || "Author",
    authorEmail: post.author?.email || "",
    authorBio: post.author?.bio || "",
    date: post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : new Date(post.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
    readTime: post.readTime || "6 min read",
    snippet: post.excerpt || post.title,
    featured: post.featured || false,
    image: post.featuredImage?.secureUrl || post.featuredImage?.url || post.ogImage || post.image || null,
    content: post.contentJson || post.content || "",
  };
}

export function mapPosts(posts) {
  return (posts || []).map(mapPost).filter(Boolean);
}

/**
 * Extract unique categories from an array of posts.
 * Returns { slug, name }[].
 */
export function extractCategories(posts) {
  const uniqueCats = {};
  (posts || []).forEach((p) => {
    if (p.categories && p.categories[0]) {
      const cat = p.categories[0];
      uniqueCats[cat.slug] = cat.name;
    }
  });
  return Object.entries(uniqueCats).map(([slug, name]) => ({ slug, name }));
}
