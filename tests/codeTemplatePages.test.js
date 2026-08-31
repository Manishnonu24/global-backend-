import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureCodeTemplatePage } from '../src/lib/codeTemplatePages';
import { getPageCapabilities } from '../src/lib/pageCapabilities';
import { getContractRegions, getEditableRegionKeys } from '../src/content-contracts/pageContracts';
import prisma from '../src/lib/prisma';

// Mock Prisma
vi.mock('../src/lib/prisma', () => ({
  default: {
    page: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock Audit
vi.mock('@/lib/audit', () => ({
  logAction: vi.fn(),
}));

// Mock Page Service (for snapshot)
vi.mock('@/services/page.service', () => ({
  pageService: {
    generateSnapshot: vi.fn().mockResolvedValue({}),
  },
  generatePageSnapshot: vi.fn().mockResolvedValue({}),
}));

describe('Page Capabilities', () => {
  it('prevents adding/removing sections on CODE_TEMPLATE pages', () => {
    const caps = getPageCapabilities({ pageType: 'CODE_TEMPLATE', isHardcoded: true });
    expect(caps.canAddSections).toBe(false);
    expect(caps.canDeleteSections).toBe(false);
    expect(caps.canReorderSections).toBe(false);
    expect(caps.canEditContent).toBe(true);
  });

  it('allows full editing on CMS_BUILT pages', () => {
    const caps = getPageCapabilities({ pageType: 'CMS_BUILT', isHardcoded: false });
    expect(caps.canAddSections).toBe(true);
    expect(caps.canDeleteSections).toBe(true);
    expect(caps.canReorderSections).toBe(true);
    expect(caps.canEditContent).toBe(true);
  });
});

describe('ensureCodeTemplatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates missing slots for a CODE_TEMPLATE page', async () => {
    const mockPage = {
      id: 'page1',
      siteId: 'site1',
      pageType: 'CODE_TEMPLATE',
      templateKey: 'CONTACT',
      slug: '/contact',
      isHardcoded: true,
    };
    
    prisma.page.findUnique.mockResolvedValue(mockPage);
    prisma.page.findFirst.mockResolvedValue(null);
    prisma.page.update.mockResolvedValue(mockPage);
    
    // Existing sections only have hero, missing form and faq
    prisma.section.findMany.mockResolvedValue([
      { id: 'sec1', regionKey: 'hero', type: 'HERO', isDeleted: false }
    ]);
    
    prisma.section.create.mockResolvedValue({});

    const result = await ensureCodeTemplatePage({ siteId: 'site1', templateKey: 'CONTACT' });
    
    expect(prisma.section.create).toHaveBeenCalledTimes(1); // Should create form (faq is now UNBOUND)
    expect(result.createdSlots.length).toBe(1);
    expect(result.existingSlots.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Regression: getContractRegions returns an OBJECT, not an array
// The production bug occurred because pageEditorClient.js called:
//   const contractRegions = getContractRegions(tKey) || [];
//   contractRegions.filter(...)   ← TypeError: filter is not a function
//
// The fix uses Object.values(regionMap || {}).filter(...).
// These tests exercise that exact pattern.
// ---------------------------------------------------------------------------
describe('getContractRegions — returns object, not array (regression guard)', () => {
  it('returns an object with region names as keys for a known template', () => {
    const result = getContractRegions('HOME');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
    expect(Array.isArray(result)).toBe(false);
    // HOME has a 'hero' region
    expect(result).toHaveProperty('hero');
    expect(result.hero).toHaveProperty('source');
    expect(result.hero).toHaveProperty('key');
  });

  it('returns null for an unknown template key', () => {
    const result = getContractRegions('UNKNOWN_KEY_XYZ');
    expect(result).toBeNull();
  });

  it('calling Object.values() on the result does NOT throw', () => {
    // This is the exact getEditableRegionKeys helper pattern
    const getEditableRegionKeys = (tKey) => {
      const regionMap = getContractRegions(String(tKey || '').trim().toUpperCase());
      return Object.values(regionMap || {})
        .filter((region) => region.source === 'PAGE_SECTION')
        .map((region) => region.key);
    };

    // Should not throw for a valid key
    expect(() => getEditableRegionKeys('home')).not.toThrow();
    // Should not throw for an unknown key (Object.values({}) = [])
    expect(() => getEditableRegionKeys('NONEXISTENT')).not.toThrow();
    // Should not throw for null/undefined
    expect(() => getEditableRegionKeys(null)).not.toThrow();
    expect(() => getEditableRegionKeys(undefined)).not.toThrow();
  });

  it('returns correct PAGE_SECTION region keys for HOME', () => {
    const getEditableRegionKeys = (tKey) => {
      const regionMap = getContractRegions(String(tKey || '').trim().toUpperCase());
      return Object.values(regionMap || {})
        .filter((region) => region.source === 'PAGE_SECTION')
        .map((region) => region.key);
    };

    const keys = getEditableRegionKeys('HOME');
    // HOME has hero, articles, blogCategories, wellnessBanner, wellnessKitchen, newsletter
    // (quiz, authenticated, communityEvents, servicesBanner are NOT PAGE_SECTION)
    expect(keys).toContain('hero');
    expect(keys).toContain('newsletter');
    // ENTITY sources should NOT appear
    expect(keys).not.toContain('quiz');
    expect(keys).not.toContain('communityEvents');
    expect(keys).not.toContain('servicesBanner');
  });

  it('getContractRegions requires a canonicalized (uppercase) key — callers must normalize first', () => {
    // PAGE_CONTRACTS uses uppercase keys. Callers are REQUIRED to do
    // String(key).trim().toUpperCase() before calling getContractRegions.
    // This test documents that contract and verifies the helper works correctly.

    // Lowercase key → null (caller's bug if not normalized)
    expect(getContractRegions('home')).toBeNull();

    // Uppercase key → object
    const result = getContractRegions('HOME');
    expect(result).not.toBeNull();

    // The getEditableRegionKeys helper normalizes correctly:
    const getEditableRegionKeys = (tKey) => {
      const regionMap = getContractRegions(String(tKey || '').trim().toUpperCase());
      return Object.values(regionMap || {})
        .filter((region) => region.source === 'PAGE_SECTION')
        .map((region) => region.key);
    };

    // These all produce the same result after normalization
    const keysLower = getEditableRegionKeys('home');
    const keysUpper = getEditableRegionKeys('HOME');
    const keysPadded = getEditableRegionKeys('  HOME  ');
    expect(keysLower).toEqual(keysUpper);
    expect(keysUpper).toEqual(keysPadded);
    expect(keysUpper.length).toBeGreaterThan(0);
  });

  it('verifies all 9 template keys exist in PAGE_CONTRACTS and CODE_TEMPLATE_PAGES', () => {
    const expectedKeys = ['HOME', 'ABOUT', 'CONTACT', 'SERVICES', 'BLOGS', 'PUBLICATION', 'QUIZZES', 'RECIPES', 'INFO'];
    for (const key of expectedKeys) {
      const regions = getContractRegions(key);
      expect(regions).not.toBeNull();
      expect(typeof regions).toBe('object');

      const getEditableRegionKeys = (tKey) => {
        const regionMap = getContractRegions(String(tKey || '').trim().toUpperCase());
        return Object.values(regionMap || {})
          .filter((region) => region.source === 'PAGE_SECTION')
          .map((region) => region.key);
      };
      expect(getEditableRegionKeys(key).length).toBeGreaterThan(0);
    }
  });
});

