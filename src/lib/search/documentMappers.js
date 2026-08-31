export function buildSearchDocumentId(type, sourceId) {
  return `${type}:${sourceId}`;
}

const stripHtml = (html) => {
  if (!html) return "";
  let text = html.replace(/<[^>]*>?/gm, " "); // Replace tags with space
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, " ").trim();
  return text.substring(0, 8000); // Limit size
};

const extractTextFromJson = (jsonObj) => {
  if (!jsonObj) return "";
  let text = "";
  if (typeof jsonObj === "string") {
    try {
      jsonObj = JSON.parse(jsonObj);
    } catch (e) {
      return stripHtml(jsonObj);
    }
  }

  const traverse = (obj) => {
    if (typeof obj === "string") {
      text += " " + obj;
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (obj !== null && typeof obj === "object") {
      Object.values(obj).forEach(traverse);
    }
  };
  traverse(jsonObj);
  return stripHtml(text);
};

// POST
export function isPostSearchable(post) {
  return post.status === "PUBLISHED" && !post.deletedAt;
}

export function mapPostToSearchDocument(post) {
  if (!isPostSearchable(post)) return null;
  const content = extractTextFromJson(post.content);
  return {
    id: buildSearchDocumentId("post", post.id),
    type: "post",
    sourceId: post.id,
    title: post.title,
    summary: post.excerpt || "",
    content,
    slug: post.slug,
    url: `/blogs/${post.slug}`,
    category: post.categories?.[0]?.name || "",
    tags: post.tags?.map((t) => t.name) || [],
    imageUrl: post.featuredImage?.url || "",
    publishedAt: post.publishedAt ? Math.floor(new Date(post.publishedAt).getTime() / 1000) : null,
    updatedAt: Math.floor(new Date(post.updatedAt).getTime() / 1000),
  };
}

// PAGE
export function isPageSearchable(page) {
  return page.status === "PUBLISHED" && !page.deletedAt;
}

export function mapPageToSearchDocument(page) {
  if (!isPageSearchable(page)) return null;
  const sectionsContent = page.sections?.map(s => extractTextFromJson(s.content)).join(" ") || "";
  
  return {
    id: buildSearchDocumentId("page", page.id),
    type: "page",
    sourceId: page.id,
    title: page.title,
    summary: page.seoDescription || "",
    content: sectionsContent,
    slug: page.slug,
    url: page.slug === "home" ? "/" : `/${page.slug}`,
    category: "",
    tags: [],
    imageUrl: page.ogImage || "",
    publishedAt: page.publishedAt ? Math.floor(new Date(page.publishedAt).getTime() / 1000) : null,
    updatedAt: Math.floor(new Date(page.updatedAt).getTime() / 1000),
  };
}

// RECIPE
export function isRecipeSearchable(recipe) {
  return recipe.status === "APPROVED";
}

export function mapRecipeToSearchDocument(recipe) {
  if (!isRecipeSearchable(recipe)) return null;
  const ingredients = extractTextFromJson(recipe.ingredients);
  const steps = extractTextFromJson(recipe.steps);

  return {
    id: buildSearchDocumentId("recipe", recipe.id),
    type: "recipe",
    sourceId: recipe.id,
    title: recipe.title,
    summary: recipe.description || "",
    content: `${ingredients} ${steps}`.trim().substring(0, 8000),
    slug: recipe.id, // Recipes don't have slug in schema, using ID as fallback. Assuming `/recipes/[id]`
    url: `/recipes/${recipe.id}`,
    category: recipe.difficulty || "", // Repurposing category for difficulty
    tags: recipe.tags?.map(t => t.name) || [],
    imageUrl: recipe.imageUrl || "",
    publishedAt: Math.floor(new Date(recipe.createdAt).getTime() / 1000),
    updatedAt: Math.floor(new Date(recipe.updatedAt).getTime() / 1000),
  };
}

// SERVICE
export function isServiceSearchable(service) {
  return service.status === "ACTIVE" && service.visibility === "PUBLIC" && !service.deletedAt && service.visible !== false;
}

export function mapServiceToSearchDocument(service) {
  if (!isServiceSearchable(service)) return null;
  return {
    id: buildSearchDocumentId("service", service.id),
    type: "service",
    sourceId: service.id,
    title: service.title,
    summary: service.description || "",
    content: extractTextFromJson(service.faqs),
    slug: service.slug,
    url: `/services/${service.slug}`,
    category: "",
    tags: [],
    imageUrl: service.featuredImage?.url || "",
    publishedAt: Math.floor(new Date(service.createdAt).getTime() / 1000),
    updatedAt: Math.floor(new Date(service.updatedAt).getTime() / 1000),
    sortOrder: service.sortOrder,
  };
}

// MAGAZINE
export function isMagazineSearchable(magazine) {
  return magazine.status === 1; // 1 = Active
}

export function mapMagazineToSearchDocument(magazine) {
  if (!isMagazineSearchable(magazine)) return null;
  return {
    id: buildSearchDocumentId("magazine", magazine.id.toString()),
    type: "magazine",
    sourceId: magazine.id.toString(),
    title: magazine.title,
    summary: magazine.description || "",
    content: magazine.introduction || "",
    slug: magazine.slug,
    url: `/publication/${magazine.slug}`,
    category: magazine.category || "",
    tags: magazine.tags ? magazine.tags.split(",").map(t => t.trim()) : [],
    imageUrl: magazine.coverImage || "",
    publishedAt: magazine.date ? Math.floor(new Date(magazine.date).getTime() / 1000) : null,
    updatedAt: Math.floor(new Date(magazine.timestamp).getTime() / 1000),
  };
}

// QUIZ (QuizType model)
export function isQuizSearchable(quizType) {
  return quizType.isActive;
}

export function mapQuizToSearchDocument(quizType) {
  if (!isQuizSearchable(quizType)) return null;
  return {
    id: buildSearchDocumentId("quiz", quizType.id.toString()),
    type: "quiz",
    sourceId: quizType.id.toString(),
    title: quizType.title,
    summary: quizType.description || "",
    content: quizType.subtitle || "",
    slug: quizType.slug,
    url: `/quizzes/${quizType.slug}`,
    category: quizType.category || "",
    tags: [],
    imageUrl: quizType.imageUrl || "",
    publishedAt: Math.floor(new Date(quizType.createdAt).getTime() / 1000),
    updatedAt: Math.floor(new Date(quizType.updatedAt).getTime() / 1000),
    sortOrder: quizType.sortOrder,
  };
}
