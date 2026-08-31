import { describe, it, expect } from "vitest";
import { applyMapping, autoCreateRelations, buildPrismaData } from "../src/lib/import/mapping.js";
import { dryRun } from "../src/lib/import/runner.js";

describe("WordPress WXR Import Regression Tests", () => {
  it("Bug 1: preserves category and tag domain objects during applyMapping", () => {
    const rawWxrRecord = {
      title: "Test WordPress Post",
      category: [
        { "@_domain": "category", "@_nicename": "health-fitness", "#text": "Health & Fitness" },
        { "@_domain": "post_tag", "@_nicename": "nutrition", "#text": "Nutrition" },
        { domain: "post_tag", name: "Wellness" },
      ],
      "content:encoded": "<p>Hello world WXR content</p>",
    };

    const fieldMap = {
      title: "title",
      category: "categories",
      "content:encoded": "content",
    };

    const mapped = applyMapping(rawWxrRecord, fieldMap);

    // categories field should preserve raw objects, NOT a flattened single string
    expect(Array.isArray(mapped.categories)).toBe(true);
    expect(mapped.categories).toHaveLength(3);
    expect(mapped.categories[0]["#text"]).toBe("Health & Fitness");
    expect(mapped.categories[1]["#text"]).toBe("Nutrition");
    expect(mapped.categories[2].name).toBe("Wellness");
  });

  it("Bug 1 & DryRun: dryRun resolves categories and tags without mutating DB", async () => {
    const records = [
      {
        rawIndex: 1,
        data: {
          title: "WXR Post With Tags and Categories",
          category: [
            { "@_domain": "category", "#text": "Tech" },
            { "@_domain": "post_tag", "#text": "AI" },
          ],
          "content:encoded": "<h1>Article HTML</h1>",
        },
      },
    ];

    const fieldMap = {
      title: "title",
      category: "categories",
      "content:encoded": "content",
    };

    const res = await dryRun({
      records,
      targetModel: "Post",
      siteId: "test-site-id",
      fieldMap,
    });

    expect(res.totalRows).toBe(1);
    expect(res.validRows).toBe(1);
    expect(res.errors).toHaveLength(0);
  });

  it("Bug 2: HTML content produces valid content object sentinel and contentJson", () => {
    const row = {
      title: "HTML Post",
      content: "<p>This is <strong>HTML</strong> content from WordPress</p>",
    };

    const { createData } = buildPrismaData("Post", "test-site", row);

    expect(createData.contentJson).toBe("<p>This is <strong>HTML</strong> content from WordPress</p>");
    expect(createData.content).not.toBeNull();
    expect(createData.content).toEqual({
      type: "html",
      version: 1,
      html: "<p>This is <strong>HTML</strong> content from WordPress</p>",
    });
  });

  it("Bug 3: truncates long canonicalUrl and ogImage to avoid column overflow", () => {
    const longUrl = "https://cdn.example.com/images/wp-content/uploads/2026/08/very-long-image-filename-with-lots-of-query-parameters-and-tokens-that-exceed-one-hundred-and-ninety-one-characters-in-total-length-which-would-normally-cause-prisma-p2000-error.jpg?token=abc123xyz456&signature=def789";

    const row = {
      title: "Long Image Post",
      ogImage: longUrl,
      canonicalUrl: longUrl,
    };

    const { createData } = buildPrismaData("Post", "test-site", row);

    expect(createData.ogImage.length).toBeLessThanOrEqual(191);
    expect(createData.canonicalUrl.length).toBeLessThanOrEqual(191);
    expect(createData.ogImage).toContain("...");
  });
});
