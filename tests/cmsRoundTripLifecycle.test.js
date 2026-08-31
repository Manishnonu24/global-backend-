import { describe, it, expect } from "vitest";
import prisma from "../src/lib/prisma.js";
import { PAGE_CONTRACTS, getContractRegions } from "../src/content-contracts/pageContracts.js";
import { CODE_TEMPLATE_PAGES, ensureCodeTemplatePage } from "../src/lib/codeTemplatePages.js";
import { getPageCapabilities } from "../src/lib/pageCapabilities.js";
import { resolvePageContent } from "../src/lib/pageContentResolver.js";
import { pageService } from "../src/services/page.service.js";
import { getDefaultSiteId } from "../src/lib/siteResolver.js";

// Round-trip tests that call ensureCodeTemplatePage require the `page` table.
// These run in CI (CI_DB_READY=true) but are skipped in local dev.
const isDbReady = process.env.CI_DB_READY === "true";

describe("Global Backend Round-Trip Lifecycle & Structural Prohibition Tests", () => {
  const all9Templates = ["HOME", "ABOUT", "CONTACT", "SERVICES", "BLOGS", "PUBLICATION", "QUIZZES", "RECIPES", "INFO"];

  it("verifies contract registration in PAGE_CONTRACTS and CODE_TEMPLATE_PAGES for all 9 pages", () => {
    for (const key of all9Templates) {
      expect(PAGE_CONTRACTS[key]).toBeDefined();
      expect(PAGE_CONTRACTS[key].templateKey).toBe(key);
      expect(CODE_TEMPLATE_PAGES[key]).toBeDefined();
    }
  });

  it("verifies structural prohibitions on all 9 CODE_TEMPLATE pages", () => {
    for (const key of all9Templates) {
      const page = { pageType: "CODE_TEMPLATE", templateKey: key, isHardcoded: true };
      const caps = getPageCapabilities(page);

      expect(caps.canAddSections).toBe(false);
      expect(caps.canDeleteSections).toBe(false);
      expect(caps.canReorderSections).toBe(false);
      expect(caps.canEditSlug).toBe(false);
      expect(caps.canEditMetadata).toBe(false);
      expect(caps.canDisable).toBe(false);
      expect(caps.canEditContent).toBe(true);
      expect(caps.canPublish).toBe(true);
    }
  });

  it.skipIf(!isDbReady)("executes authentic service-path round-trip lifecycle for all 9 pages", async () => {
    const siteId = getDefaultSiteId();

    for (const templateKey of all9Templates) {
      // 1. Reconciliation
      const res = await ensureCodeTemplatePage({ siteId, templateKey });
      const pageId = res.page.id;
      const initialSections = res.page.sections;
      expect(initialSections.length).toBeGreaterThan(0);

      // 2. Editor Capabilities
      const caps = getPageCapabilities(res.page);
      expect(caps.canEditContent).toBe(true);
      expect(caps.canAddSections).toBe(false);

      // 3. Find first PAGE_SECTION region key and declared field
      const regions = getContractRegions(templateKey);
      const firstSectionRegionKey = Object.keys(regions).find((k) => regions[k].source === "PAGE_SECTION");
      expect(firstSectionRegionKey).toBeDefined();

      const targetSection = initialSections.find((s) => s.regionKey === firstSectionRegionKey);
      expect(targetSection).toBeDefined();

      const regionDef = regions[firstSectionRegionKey];
      const targetFieldDef = regionDef.fields?.[0];
      expect(targetFieldDef).toBeDefined();

      const fieldKey = targetFieldDef.key;
      const originalValue = targetSection.content[fieldKey];
      const testVal = `Test ${templateKey} ${Date.now()}`;

      const originalSnapshot = res.page.publishedSnapshot;

      try {
        // 4. Confirm unknown field rejection via real pageService.updateSection
        await expect(
          pageService.updateSection(siteId, pageId, targetSection.id, {
            content: { ...targetSection.content, undeclaredInvalidTestField: "invalid" },
          })
        ).rejects.toThrow();

        // 5. Authentic Section Patching via real pageService.updateSection
        const updatedSection = await pageService.updateSection(siteId, pageId, targetSection.id, {
          content: { ...targetSection.content, [fieldKey]: testVal },
        });

        // 6. DB Persistence check
        expect(updatedSection.content[fieldKey]).toBe(testVal);

        // 7. Draft Resolver check
        const reFetchedSections = await prisma.section.findMany({
          where: { pageId, isDeleted: false },
        });
        const draftResolved = resolvePageContent(templateKey, reFetchedSections);
        expect(draftResolved[firstSectionRegionKey][fieldKey]).toBe(testVal);

        // 8. Public Isolation check (publishedSnapshot still holds old snapshot, not new draft)
        const pageBeforePublish = await prisma.page.findUnique({ where: { id: pageId } });
        const snapshotSecBefore = pageBeforePublish.publishedSnapshot?.sections?.find((s) => s.regionKey === firstSectionRegionKey);
        if (snapshotSecBefore) {
          expect(snapshotSecBefore.content[fieldKey]).not.toBe(testVal);
        }

        // 9. Snapshot Re-generation via real service
        const newSnapshot = await pageService.generateSnapshot(siteId, pageId);
        await prisma.page.update({
          where: { id: pageId },
          data: { publishedSnapshot: newSnapshot, status: "PUBLISHED" },
        });

        // 10. Published snapshot check
        const pageAfterPublish = await prisma.page.findUnique({ where: { id: pageId } });
        const pubSnapshotSec = pageAfterPublish.publishedSnapshot?.sections?.find((s) => s.regionKey === firstSectionRegionKey);
        expect(pubSnapshotSec.content[fieldKey]).toBe(testVal);

        // 11. Content Resolver check for published snapshot
        const publicResolved = resolvePageContent(templateKey, pageAfterPublish.publishedSnapshot.sections);
        expect(publicResolved[firstSectionRegionKey][fieldKey]).toBe(testVal);

      } finally {
        // 12. Restoration in finally block
        await pageService.updateSection(siteId, pageId, targetSection.id, {
          content: { ...targetSection.content, [fieldKey]: originalValue },
        });
        if (originalSnapshot) {
          await prisma.page.update({
            where: { id: pageId },
            data: { publishedSnapshot: originalSnapshot },
          });
        }
      }
    }
  }, 60000);
});
