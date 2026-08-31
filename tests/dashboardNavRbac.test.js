import { describe, expect, it } from "vitest";
import { filterNavItems, buildCommandPaletteItems, CMS_SECTIONS, CRM_SECTIONS } from "../src/lib/dashboardNav";

describe("Dashboard Navigation RBAC Filtering", () => {
  describe("Sidebar Sections Filtering", () => {
    it("VIEWER role - sees viewer level items only (CRM Dashboard, Analytics)", () => {
      const filteredCrm = filterNavItems(CRM_SECTIONS, "VIEWER");
      const flatLinks = filteredCrm.flatMap(s => s.links).map(l => l.label);
      
      expect(flatLinks).toContain("CRM Dashboard");
      expect(flatLinks).toContain("Analytics Dashboard");
      expect(flatLinks).not.toContain("Subscribers");
      expect(flatLinks).not.toContain("Email Settings");

      const filteredCms = filterNavItems(CMS_SECTIONS, "VIEWER");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      expect(flatCmsLinks).toContain("Dashboard");
      expect(flatCmsLinks).not.toContain("Pages");
    });

    it("AUTHOR role - sees author and viewer items", () => {
      const filteredCms = filterNavItems(CMS_SECTIONS, "AUTHOR");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      
      expect(flatCmsLinks).toContain("Dashboard");
      expect(flatCmsLinks).toContain("Blogs");
      expect(flatCmsLinks).toContain("Media");
      expect(flatCmsLinks).not.toContain("Pages");
      expect(flatCmsLinks).not.toContain("Users");
    });

    it("MARKETING role - handles CRM light correctly (between Author and Viewer)", () => {
      // MARKETING is level 2. Should see VIEWER(1) but not AUTHOR(3) or EDITOR(4)
      const filteredCrm = filterNavItems(CRM_SECTIONS, "MARKETING");
      const flatLinks = filteredCrm.flatMap(s => s.links).map(l => l.label);
      
      expect(flatLinks).toContain("CRM Dashboard");
      expect(flatLinks).toContain("Analytics Dashboard");
      expect(flatLinks).not.toContain("Subscribers"); // EDITOR
      
      const filteredCms = filterNavItems(CMS_SECTIONS, "MARKETING");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      expect(flatCmsLinks).toContain("Dashboard"); // VIEWER
      expect(flatCmsLinks).not.toContain("Blogs"); // AUTHOR
      expect(flatCmsLinks).not.toContain("Pages"); // EDITOR
    });

    it("EDITOR role - sees editor, author, viewer items", () => {
      const filteredCms = filterNavItems(CMS_SECTIONS, "EDITOR");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      
      expect(flatCmsLinks).toContain("Pages");
      expect(flatCmsLinks).toContain("Blogs");
      expect(flatCmsLinks).toContain("Services");
      expect(flatCmsLinks).not.toContain("Header Builder"); // ADMIN
      expect(flatCmsLinks).not.toContain("Users"); // ADMIN
    });

    it("ADMIN role - sees all standard items", () => {
      const filteredCms = filterNavItems(CMS_SECTIONS, "ADMIN");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      
      expect(flatCmsLinks).toContain("Pages");
      expect(flatCmsLinks).toContain("Header Builder");
      expect(flatCmsLinks).toContain("Users");
      expect(flatCmsLinks).toContain("Notifications");
    });

    it("SUPERADMIN role - sees all items", () => {
      const filteredCms = filterNavItems(CMS_SECTIONS, "SUPERADMIN");
      const flatCmsLinks = filteredCms.flatMap(s => s.links).map(l => l.label);
      
      expect(flatCmsLinks).toContain("Header Builder");
      expect(flatCmsLinks).toContain("Users");
    });
  });

  describe("Command Palette Filtering", () => {
    it("builds flat item list correctly for VIEWER", () => {
      const items = buildCommandPaletteItems("VIEWER");
      const names = items.map(i => i.name);

      expect(names).toContain("Dashboard");
      expect(names).toContain("CRM Dashboard");
      expect(names).not.toContain("Pages");
      expect(names).not.toContain("Email Settings");
    });

    it("builds flat item list correctly for ADMIN", () => {
      const items = buildCommandPaletteItems("ADMIN");
      const names = items.map(i => i.name);

      expect(names).toContain("Pages");
      expect(names).toContain("Backup & Restore"); // Advanced link
      expect(names).toContain("Users");
    });
  });
});
