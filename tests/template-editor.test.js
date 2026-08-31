import { describe, it, expect, vi } from 'vitest';
import { getAllowedSlotFields, filterToAllowedFields, validateContractContent } from '../src/lib/templateSlotFields.js';
import { getPageCapabilities } from '../src/lib/pageCapabilities.js';

describe('CODE_TEMPLATE Field Restrictions', () => {
  it('returns valid allowed fields for known template slots', () => {
    const fields = getAllowedSlotFields('HOME', 'hero');
    expect(fields).toBeDefined();
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.find(f => f.key === 'title')).toBeDefined();
  });

  it('filters unknown fields out of content payload', () => {
    const maliciousPayload = {
      title: 'My Title',
      hackedField: 'Should be removed',
      badge: 'New'
    };

    const filtered = filterToAllowedFields('HOME', 'hero', maliciousPayload);
    
    expect(filtered.title).toBe('My Title');
    expect(filtered.badge).toBe('New');
    expect(filtered.hackedField).toBeUndefined();
  });

  it('returns null for completely unknown template slots (fails closed)', () => {
    const filtered = filterToAllowedFields('HOME', 'unknownSlot', { title: 'Test' });
    expect(filtered).toBeNull();
  });

  it('strictly validates contract content types', () => {
    const payload = {
      title: 123, // Should be string (HOME.hero)
      items: 'Not an array', // Should be object-list (ABOUT.stats)
    };
    
    // Testing object-list validation
    const resultStats = validateContractContent('ABOUT', 'stats', payload);
    expect(resultStats.valid).toBe(false);
    expect(resultStats.invalidFields.some(f => f.field === 'items' && f.reason === 'must be an array')).toBe(true);

    // Testing string validation
    const resultHero = validateContractContent('HOME', 'hero', payload);
    expect(resultHero.valid).toBe(false);
    expect(resultHero.invalidFields.some(f => f.field === 'title' && f.reason === 'must be a string')).toBe(true);
  });
});

describe('Page Capabilities', () => {
  it('restricts CODE_TEMPLATE structural mutations', () => {
    const page = { pageType: 'CODE_TEMPLATE' };
    const caps = getPageCapabilities(page);

    expect(caps.canEditContent).toBe(true);
    expect(caps.canAddSections).toBe(false);
    expect(caps.canReorderSections).toBe(false);
    expect(caps.canDeleteSections).toBe(false);
    expect(caps.canHideSections).toBe(false);
    expect(caps.canDisable).toBe(false);
  });

  it('allows full mutations for CMS_BUILT pages', () => {
    const page = { pageType: 'CMS_BUILT' };
    const caps = getPageCapabilities(page);

    expect(caps.canEditContent).toBe(true);
    expect(caps.canAddSections).toBe(true);
    expect(caps.canReorderSections).toBe(true);
    expect(caps.canDeleteSections).toBe(true);
    expect(caps.canHideSections).toBe(true);
  });
});
