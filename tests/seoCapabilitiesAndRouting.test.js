import { describe, it, expect } from "vitest";
import { getPageCapabilities, can } from "../src/lib/pageCapabilities";
import { classifyRoute, isDynamicRoutePattern } from "../src/lib/routeClassification";
import { getSeoMetadata } from "../src/lib/seo";

describe("SEO Capability Matrix & Page Permissions", () => {
  it("allows SEO editing on CODE_TEMPLATE while keeping metadata title and slug read-only", () => {
    const caps = getPageCapabilities({ pageType: "CODE_TEMPLATE", slug: "/about" });
    expect(caps.canEditSeo).toBe(true);
    expect(caps.canEditMetadata).toBe(false);
    expect(caps.canEditSlug).toBe(false);
    expect(can("canEditSeo", { pageType: "CODE_TEMPLATE", slug: "/about" })).toBe(true);
  });

  it("prohibits SEO editing on SYSTEM routes", () => {
    const caps = getPageCapabilities({ pageType: "SYSTEM", slug: "/api/health" });
    expect(caps.canEditSeo).toBe(false);
    expect(caps.canEditMetadata).toBe(false);
    expect(caps.canEditSlug).toBe(false);
  });

  it("allows full SEO, metadata, and slug editing on CMS_BUILT pages", () => {
    const caps = getPageCapabilities({ pageType: "CMS_BUILT", slug: "/my-custom-page" });
    expect(caps.canEditSeo).toBe(true);
    expect(caps.canEditMetadata).toBe(true);
    expect(caps.canEditSlug).toBe(true);
  });

  it("prohibits SEO editing directly on unresolved dynamic route patterns in page editor", () => {
    const caps = getPageCapabilities({ pageType: "CMS_BUILT", slug: "/blogs/[slug]" });
    expect(caps.canEditSeo).toBe(false);
    expect(caps.canEditMetadata).toBe(false);
    expect(caps.canEditSlug).toBe(false);
  });
});

describe("Route Classification for Fixed Code Templates", () => {
  const expectedTemplates = [
    { route: "/", key: "HOME" },
    { route: "/about", key: "ABOUT" },
    { route: "/contact", key: "CONTACT" },
    { route: "/services", key: "SERVICES" },
    { route: "/blogs", key: "BLOGS" },
    { route: "/publication", key: "PUBLICATION" },
    { route: "/quizzes", key: "QUIZZES" },
    { route: "/recipes", key: "RECIPES" },
    { route: "/info", key: "INFO" },
  ];

  expectedTemplates.forEach(({ route, key }) => {
    it(`classifies '${route}' as CODE_TEMPLATE with templateKey '${key}'`, () => {
      const res = classifyRoute({ pathname: route, isDynamic: false });
      expect(res.pageType).toBe("CODE_TEMPLATE");
      expect(res.templateKey).toBe(key);
      expect(res.isHardcoded).toBe(true);
    });
  });
});

describe("SEO Resolver & Non-Indexable Guards", () => {
  it("resolves default indexable metadata for home route", async () => {
    const seo = await getSeoMetadata("/");
    expect(seo).toBeDefined();
    expect(seo.robots.index).toBe(true);
    expect(seo.robots.follow).toBe(true);
  });

  it("enforces noindex on private service token routes", async () => {
    const seo = await getSeoMetadata("/services/private/token-12345");
    expect(seo.robots.index).toBe(false);
    expect(seo.robots.follow).toBe(false);
  });

  it("enforces noindex on quiz result pages", async () => {
    const seo = await getSeoMetadata("/quizzes/results/sleep-quality");
    expect(seo.robots.index).toBe(false);
    expect(seo.robots.follow).toBe(false);
  });
});
