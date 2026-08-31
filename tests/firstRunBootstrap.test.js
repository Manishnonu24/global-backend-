import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ acquired: 1 }]),
    site: {
      upsert: vi.fn().mockResolvedValue({ id: "AHP" }),
    },
    globalSettings: {
      upsert: vi.fn().mockResolvedValue({ siteId: "AHP" }),
    },
  },
  syncRoutes: vi.fn().mockResolvedValue({ siteId: "AHP", synced: 3 }),
  ensureCodeTemplatePage: vi.fn().mockImplementation(async ({ siteId, templateKey }) => ({
    status: "active",
    page: { siteId, templateKey },
    createdSlots: [],
    migratedSections: [],
    existingSlots: [{ id: `${templateKey}-slot` }],
    ambiguousSections: [],
    invalidSections: [],
  })),
}));

vi.mock("@/lib/prisma", () => ({
  default: mocks.prisma,
}));

vi.mock("@/lib/routeSync", () => ({
  syncRoutes: mocks.syncRoutes,
}));

vi.mock("@/lib/codeTemplatePages", () => ({
  CODE_TEMPLATE_PAGES: {
    HOME: { title: "Home", slug: "/" },
    CONTACT: { title: "Contact", slug: "/contact" },
  },
  ensureCodeTemplatePage: mocks.ensureCodeTemplatePage,
}));

describe("ensureApplicationState", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_ID;
    delete process.env.SITE_ID;
    process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/app";
  });

  it("creates the canonical default site, settings, routes, and template pages", async () => {
    const { ensureApplicationState } = await import("@/lib/bootstrap/ensureApplicationState");

    const result = await ensureApplicationState({ force: true });

    expect(mocks.prisma.site.upsert).toHaveBeenCalledWith({
      where: { id: "AHP" },
      update: { isActive: true, deletedAt: null },
      create: {
        id: "AHP",
        name: "A Health Place",
        domain: "ahealthplace.com",
        isActive: true,
      },
    });
    expect(mocks.prisma.globalSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: "AHP" },
        update: {},
        create: expect.objectContaining({
          siteId: "AHP",
          websiteSettings: expect.objectContaining({ title: "A Health Place" }),
          navigation: expect.objectContaining({ main: expect.any(Array) }),
        }),
      })
    );
    expect(mocks.syncRoutes).toHaveBeenCalledTimes(1);
    expect(mocks.ensureCodeTemplatePage).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("ok");
  });

  it("reuses one process-local bootstrap promise", async () => {
    const { ensureApplicationState } = await import("@/lib/bootstrap/ensureApplicationState");

    await Promise.all([ensureApplicationState(), ensureApplicationState()]);

    expect(mocks.prisma.site.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.ensureCodeTemplatePage).toHaveBeenCalledTimes(2);
  });
});
