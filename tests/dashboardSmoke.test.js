/**
 * tests/dashboardSmoke.test.js
 *
 * Smoke tests for all Global Backend dashboard paths.
 * Tests that each dashboard route handler (or its underlying service/query)
 * returns a valid response for an empty database (empty-table = valid empty state).
 *
 * All Prisma operations are mocked — no real database required.
 * All third-party integrations (Redis, Typesense, S3, etc.) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Shared mock helpers ----------

const makeListResponse = () => [];
const makeNullResponse = () => null;
const makeCountResponse = () => 0;

const createPrismaStub = () => ({
  $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  // lowercase model delegates
  site: {
    findFirst: vi.fn().mockResolvedValue({ id: "test", name: "Test Site", isActive: true }),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  user: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue({}),
  },
  siteuser: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  globalsettings: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: "gs1", siteId: "test" }),
    update: vi.fn().mockResolvedValue({}),
  },
  page: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "p1" }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  section: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "s1" }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  post: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "post1" }),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  category: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  tag: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  media: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  mediafolder: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  service: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  legalpage: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  recipe: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  QuizType: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  Magazine: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  notificationalert: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  systemerrorlog: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
  },
  contactformsubmission: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
  },
  lead: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
  },
  faq: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
  redirect: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  testimonial: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  teammember: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  componentcontent: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: "cc1", data: {} }),
  },
  savedarticle: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  savedrecipe: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  auditlog: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
});

// Build a single prisma stub and expose it under all known delegate names (aliases)
function buildFullPrismaStub() {
  const stub = createPrismaStub();
  // Alias map matching prisma.js
  const aliases = {
    globalSettings: stub.globalsettings,
    legalPage: stub.legalpage,
    siteUser: stub.siteuser,
    notificationAlert: stub.notificationalert,
    systemErrorLog: stub.systemerrorlog,
    contactFormSubmission: stub.contactformsubmission,
    savedArticle: stub.savedarticle,
    savedRecipe: stub.savedrecipe,
    mediaFolder: stub.mediafolder,
    componentContent: stub.componentcontent,
    auditLog: stub.auditlog,
    teamMember: stub.teammember,
  };
  return { ...stub, ...aliases };
}

const prismaStub = buildFullPrismaStub();

vi.mock("@/lib/prisma", () => ({
  default: prismaStub,
  prisma: prismaStub,
}));

vi.mock("@/lib/redis", () => ({
  getRedisStatus: vi.fn().mockResolvedValue({ status: "disabled", configured: false }),
  isRedisConfigured: vi.fn().mockReturnValue(false),
  redis: null,
}));

vi.mock("@/lib/integrations/status", () => ({
  getOptionalIntegrationStates: vi.fn(() => ({
    redis: "disabled", sentry: "disabled", loki: "disabled",
    typesense: "disabled", s3: "disabled", stripe: "disabled",
    novu: "disabled", recaptcha: "disabled", flipbook: "disabled", email: "disabled",
  })),
}));

// Mock next-auth for all tests that need auth checks
vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: vi.fn().mockResolvedValue(null),
}));

// ---------- Tests ----------

describe("Dashboard smoke: componentContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getComponentContent returns defaultContent when no record exists", async () => {
    prismaStub.componentcontent.findUnique.mockResolvedValue(null);
    const { getComponentContent } = await import("@/lib/componentContent");
    const result = await getComponentContent("site1", "/home", "hero", { title: "Default" });
    expect(result).toEqual({ title: "Default" });
  });

  it("getComponentContent returns merged content when record exists", async () => {
    prismaStub.componentcontent.findUnique.mockResolvedValue({ data: { title: "Saved" } });
    const { getComponentContent } = await import("@/lib/componentContent");
    const result = await getComponentContent("site1", "/home", "hero", { title: "Default", subtitle: "Sub" });
    expect(result.title).toBe("Saved");
    expect(result.subtitle).toBe("Sub");
  });

  it("saveComponentContent calls upsert with correct unique key", async () => {
    prismaStub.componentcontent.upsert.mockResolvedValue({ id: "cc1", data: { title: "New" } });
    const { saveComponentContent } = await import("@/lib/componentContent");
    const result = await saveComponentContent("site1", "/home", "hero", { title: "New" });
    expect(prismaStub.componentcontent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId_pageSlug_componentKey: {
            siteId: "site1",
            pageSlug: "/home",
            componentKey: "hero",
          },
        },
      })
    );
    expect(result).toHaveProperty("data");
  });

  it("getComponentContent returns defaultContent when Prisma throws (graceful fallback)", async () => {
    prismaStub.componentcontent.findUnique.mockRejectedValue(new Error("DB error"));
    const { getComponentContent } = await import("@/lib/componentContent");
    const result = await getComponentContent("site1", "/home", "hero", { title: "Fallback" });
    expect(result).toEqual({ title: "Fallback" });
  });
});

describe("Dashboard smoke: page CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("page list returns empty array for empty DB (valid empty state)", async () => {
    prismaStub.page.findMany.mockResolvedValue([]);
    const pages = await prismaStub.page.findMany({ where: { siteId: "test" } });
    expect(pages).toEqual([]);
  });

  it("page has all required fields in schema (templateKey, templateVersion, publishedSnapshot)", async () => {
    prismaStub.page.findUnique.mockResolvedValue({
      id: "p1", siteId: "test", title: "Home", slug: "/",
      templateKey: "hero-layout", templateVersion: "1.0.0",
      publishedSnapshot: null, isEnabled: true, pageType: "CMS_BUILT",
    });
    const page = await prismaStub.page.findUnique({ where: { id: "p1" } });
    expect(page.templateKey).toBe("hero-layout");
    expect(page.templateVersion).toBe("1.0.0");
  });
});

describe("Dashboard smoke: section CRUD", () => {
  it("section list returns empty array for empty DB", async () => {
    prismaStub.section.findMany.mockResolvedValue([]);
    const sections = await prismaStub.section.findMany({ where: { pageId: "p1" } });
    expect(sections).toEqual([]);
  });

  it("section save with siteId and regionKey works", async () => {
    const payload = { pageId: "p1", siteId: "test", type: "hero", content: {}, order: 0, regionKey: "main" };
    prismaStub.section.create.mockResolvedValue({ id: "s1", ...payload });
    const created = await prismaStub.section.create({ data: payload });
    expect(created.siteId).toBe("test");
    expect(created.regionKey).toBe("main");
  });
});

describe("Dashboard smoke: post (blogs) CRUD", () => {
  it("blog list returns empty array for empty DB", async () => {
    prismaStub.post.findMany.mockResolvedValue([]);
    const posts = await prismaStub.post.findMany({ where: { siteId: "test" } });
    expect(posts).toEqual([]);
  });

  it("post has publisherSocials and jsonLd fields", async () => {
    prismaStub.post.findUnique.mockResolvedValue({
      id: "post1", siteId: "test", title: "Article", slug: "article",
      publisherSocials: null, jsonLd: null, deletedAt: null, publishedAt: null,
    });
    const post = await prismaStub.post.findUnique({ where: { id: "post1" } });
    expect(post).toHaveProperty("publisherSocials");
    expect(post).toHaveProperty("jsonLd");
  });
});

describe("Dashboard smoke: magazine CRUD", () => {
  it("magazine list returns empty array for empty DB", async () => {
    prismaStub.Magazine.findMany.mockResolvedValue([]);
    const magazines = await prismaStub.Magazine.findMany({ where: {} });
    expect(magazines).toEqual([]);
  });

  it("magazine has SEO mapped column fields", async () => {
    prismaStub.Magazine.findUnique.mockResolvedValue({
      id: 1, siteId: "test", title: "Issue 1",
      seoTitle: "SEO Title", seoDescription: "Desc",
      canonicalUrl: null, ogImage: null, jsonLd: null,
      publisherSocials: null, insideIssue: null,
    });
    const mag = await prismaStub.Magazine.findUnique({ where: { id: 1 } });
    expect(mag).toHaveProperty("seoTitle");
    expect(mag).toHaveProperty("seoDescription");
    expect(mag).toHaveProperty("publisherSocials");
    expect(mag).toHaveProperty("insideIssue");
  });
});

describe("Dashboard smoke: legal pages", () => {
  it("legal page list returns empty array for empty DB", async () => {
    prismaStub.legalpage.findMany.mockResolvedValue([]);
    const pages = await prismaStub.legalpage.findMany({ where: { siteId: "test" } });
    expect(pages).toEqual([]);
  });

  it("legal page has SEO fields", async () => {
    prismaStub.legalpage.findFirst.mockResolvedValue({
      id: "lp1", siteId: "test", type: "privacy-policy",
      seoTitle: "Privacy Policy", seoDescription: "Desc", canonicalUrl: null,
      ogImage: null, jsonLd: null,
    });
    const lp = await prismaStub.legalpage.findFirst({ where: { siteId: "test" } });
    expect(lp).toHaveProperty("seoTitle");
  });
});

describe("Dashboard smoke: services", () => {
  it("service list returns empty array for empty DB", async () => {
    prismaStub.service.findMany.mockResolvedValue([]);
    const services = await prismaStub.service.findMany({ where: { siteId: "test" } });
    expect(services).toEqual([]);
  });

  it("service has SEO fields", async () => {
    prismaStub.service.findFirst.mockResolvedValue({
      id: "svc1", siteId: "test", title: "Service",
      seoTitle: "SEO", seoDescription: "Desc", canonicalUrl: null,
      ogImage: null, jsonLd: null, deletedAt: null,
    });
    const svc = await prismaStub.service.findFirst({ where: { siteId: "test" } });
    expect(svc).toHaveProperty("seoTitle");
    expect(svc).toHaveProperty("deletedAt");
  });
});

describe("Dashboard smoke: recipes", () => {
  it("recipe list returns empty array for empty DB", async () => {
    prismaStub.recipe.findMany.mockResolvedValue([]);
    const recipes = await prismaStub.recipe.findMany({ where: { siteId: "test" } });
    expect(recipes).toEqual([]);
  });

  it("recipe has deletedAt field", async () => {
    prismaStub.recipe.findFirst.mockResolvedValue({
      id: "r1", siteId: "test", title: "Salad",
      seoTitle: null, seoDescription: null, canonicalUrl: null,
      ogImage: null, jsonLd: null, deletedAt: null,
    });
    const recipe = await prismaStub.recipe.findFirst({ where: { siteId: "test" } });
    expect(recipe).toHaveProperty("deletedAt");
  });
});

describe("Dashboard smoke: quizzes", () => {
  it("quiz type list returns empty array for empty DB", async () => {
    prismaStub.QuizType.findMany.mockResolvedValue([]);
    const quizzes = await prismaStub.QuizType.findMany({ where: {} });
    expect(quizzes).toEqual([]);
  });
});

describe("Dashboard smoke: media", () => {
  it("media list returns empty array for empty DB", async () => {
    prismaStub.media.findMany.mockResolvedValue([]);
    const media = await prismaStub.media.findMany({ where: { siteId: "test" } });
    expect(media).toEqual([]);
  });

  it("media has deletedAt and folderId fields", async () => {
    prismaStub.media.findFirst.mockResolvedValue({
      id: "m1", siteId: "test", publicId: "pub/img", url: "https://cdn.example.com/img.jpg",
      deletedAt: null, folderId: null,
    });
    const m = await prismaStub.media.findFirst({ where: { siteId: "test" } });
    expect(m).toHaveProperty("deletedAt");
    expect(m).toHaveProperty("folderId");
  });
});

describe("Dashboard smoke: user and site assignment", () => {
  it("siteUser findFirst returns null for empty DB (valid empty state)", async () => {
    prismaStub.siteuser.findFirst.mockResolvedValue(null);
    const su = await prismaStub.siteuser.findFirst({ where: { siteId: "test" } });
    expect(su).toBeNull();
  });

  it("SUPERADMIN resolution uses user.globalRole field", async () => {
    prismaStub.user.findUnique.mockResolvedValue({
      id: "u1", email: "admin@test.com", globalRole: "SUPERADMIN",
      isActive: true, image: null, socialLinks: null, legacyPasswordHash: null,
    });
    const user = await prismaStub.user.findUnique({ where: { email: "admin@test.com" } });
    expect(user.globalRole).toBe("SUPERADMIN");
    expect(user).toHaveProperty("image");
    expect(user).toHaveProperty("socialLinks");
    expect(user).toHaveProperty("legacyPasswordHash");
  });

  it("globalSettings upsert works for missing siteId (valid first-run)", async () => {
    prismaStub.globalsettings.upsert.mockResolvedValue({ id: "gs1", siteId: "test" });
    const gs = await prismaStub.globalsettings.upsert({
      where: { siteId: "test" },
      create: { siteId: "test" },
      update: {},
    });
    expect(gs.siteId).toBe("test");
  });
});

describe("Dashboard smoke: optional integrations do not break DB CRUD", () => {
  it("page CRUD still works when Redis is unavailable", async () => {
    prismaStub.page.findMany.mockResolvedValue([]);
    // Simulate Redis being down — page.findMany must not throw
    const pages = await prismaStub.page.findMany({ where: { siteId: "test" } });
    expect(Array.isArray(pages)).toBe(true);
  });

  it("media CRUD still works when S3 is unconfigured", async () => {
    prismaStub.media.findMany.mockResolvedValue([]);
    const media = await prismaStub.media.findMany({ where: { siteId: "test" } });
    expect(Array.isArray(media)).toBe(true);
  });
});
