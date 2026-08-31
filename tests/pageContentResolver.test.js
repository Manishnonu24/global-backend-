import { describe, it, expect } from "vitest";
import { resolvePageContent } from "../src/lib/pageContentResolver.js";

describe("resolvePageContent", () => {
  it("returns canonical values when stored in content", () => {
    const sections = [
      {
        regionKey: "hero",
        content: {
          badge: "Custom Badge",
          title: "Custom Title",
          description: "Custom Desc",
          primaryButtonText: "Click Me",
          primaryButtonUrl: "/custom-url",
        },
      },
    ];

    const resolved = resolvePageContent("HOME", sections);
    expect(resolved.hero.badge).toBe("Custom Badge");
    expect(resolved.hero.title).toBe("Custom Title");
    expect(resolved.hero.description).toBe("Custom Desc");
    expect(resolved.hero.primaryButtonText).toBe("Click Me");
    expect(resolved.hero.primaryButtonUrl).toBe("/custom-url");
  });

  it("reads legacy aliases as fallbacks when canonical key is absent", () => {
    const sections = [
      {
        regionKey: "hero",
        content: {
          eyebrow: "Legacy Eyebrow",
          body: "Legacy Body Text",
        },
      },
    ];

    const resolved = resolvePageContent("HOME", sections);
    expect(resolved.hero.badge).toBe("Legacy Eyebrow");
    expect(resolved.hero.description).toBe("Legacy Body Text");
  });

  it("preserves boolean false and numeric 0 without overriding with defaults", () => {
    const sections = [
      {
        regionKey: "wellnessBanner",
        content: {
          enabled: false,
        },
      },
    ];

    const resolved = resolvePageContent("HOME", sections);
    expect(resolved.wellnessBanner.enabled).toBe(false);
  });

  it("preserves empty strings and empty arrays", () => {
    const sections = [
      {
        regionKey: "wellnessBanner",
        content: {
          headline: "",
          buttonText: "",
        },
      },
      {
        regionKey: "trustBadges",
        content: {
          items: [],
        },
      },
    ];

    const resolvedBanner = resolvePageContent("HOME", sections);
    expect(resolvedBanner.wellnessBanner.headline).toBe("");
    expect(resolvedBanner.wellnessBanner.buttonText).toBe("");

    const resolvedPub = resolvePageContent("PUBLICATION", sections);
    expect(resolvedPub.trustBadges.items).toEqual([]);
  });

  it("provides deep-cloned object-list defaults when field is missing", () => {
    const resolved = resolvePageContent("ABOUT", []);
    expect(Array.isArray(resolved.stats.items)).toBe(true);
    expect(resolved.stats.items.length).toBe(4);
    expect(resolved.stats.items[0]).toEqual({ value: "500+", label: "Verified Articles" });
  });

  it("handles missing section records cleanly by falling back to contract defaults", () => {
    const resolved = resolvePageContent("HOME", []);
    expect(resolved.hero.badge).toBe("Your Health Journey Begins with Improved Information");
    expect(resolved.newsletter.buttonText).toBe("Subscribe");
  });

  it("handles invalid or non-object section content gracefully", () => {
    const sections = [
      { regionKey: "hero", content: null },
      { regionKey: "newsletter", content: "invalid string" },
    ];

    const resolved = resolvePageContent("HOME", sections);
    expect(resolved.hero.badge).toBe("Your Health Journey Begins with Improved Information");
    expect(resolved.newsletter.buttonText).toBe("Subscribe");
  });

  it("returns empty object for unknown template keys", () => {
    const resolved = resolvePageContent("NON_EXISTENT_KEY", []);
    expect(resolved).toEqual({});
  });
});
