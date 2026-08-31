import { describe, it, expect } from "vitest";
import prisma from "../src/lib/prisma.js";
import { ensureCodeTemplatePage, CODE_TEMPLATE_PAGES } from "../src/lib/codeTemplatePages.js";
import { getDefaultSiteId } from "../src/lib/siteResolver.js";

// This test requires a fully migrated database with the `page` table present.
// It is skipped in local dev and only runs in CI (where CI_DB_READY=true is set).
const isDbReady = process.env.CI_DB_READY === "true";

describe.skipIf(!isDbReady)("ensureCodeTemplatePage integration & idempotency", () => {
  it("initializes all 9 CODE_TEMPLATE pages and verifies idempotency & snapshots", async () => {
    const siteId = getDefaultSiteId();
    const keys = Object.keys(CODE_TEMPLATE_PAGES);

    expect(keys.length).toBe(9);

    for (const key of keys) {
      // Run 1: ensure page & slots exist
      const res1 = await ensureCodeTemplatePage({ siteId, templateKey: key });
      expect(res1.status).toBe("active");
      expect(res1.page).toBeDefined();
      expect(res1.page.id).toBeDefined();
      expect(res1.page.pageType).toBe("CODE_TEMPLATE");
      expect(res1.page.sections.length).toBeGreaterThan(0);
      expect(res1.page.publishedSnapshot).toBeDefined();
      expect(res1.page.publishedSnapshot).not.toBeNull();
      expect(res1.page.publishedSnapshot.sections).toBeDefined();

      // Run 2: Idempotency check (no duplicate slots, same section count)
      const res2 = await ensureCodeTemplatePage({ siteId, templateKey: key });
      expect(res2.createdSlots.length).toBe(0);
      expect(res2.page.id).toBe(res1.page.id);
      expect(res2.page.sections.length).toBe(res1.page.sections.length);
      expect(res2.page.publishedSnapshot.sections.length).toBe(res1.page.publishedSnapshot.sections.length);
    }
  }, 20000);
});
