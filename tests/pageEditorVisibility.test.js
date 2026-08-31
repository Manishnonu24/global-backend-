import { describe, it, expect } from 'vitest';
import { getContractRegions, getContractRegion } from '../src/content-contracts/pageContracts';
import { getAllowedSlotFields, validateContractContent } from '../src/lib/templateSlotFields';
import { getPageCapabilities } from '../src/lib/pageCapabilities';
import { isDynamicRoutePattern } from '../src/lib/routeClassification';

describe('Page Editor Field Visibility & Content Contracts', () => {
  it('1. HOME page contracts auto-select hero and define correct PAGE_SECTION regions', () => {
    const homeMap = getContractRegions('HOME');
    const homeRegions = Object.values(homeMap);
    const editableRegions = homeRegions.filter(r => r.source === 'PAGE_SECTION');
    
    // First editable region must be hero
    expect(editableRegions[0].key).toBe('hero');
    expect(homeRegions.map(r => r.key)).toEqual([
      'hero', 'articles', 'blogCategories', 'wellnessBanner', 'quiz', 'wellnessKitchen', 'authenticated', 'communityEvents', 'servicesBanner', 'newsletter'
    ]);
  });

  it('2. HOME hero displays badge, title, description, primary/secondary buttons and bg images', () => {
    const heroFields = getAllowedSlotFields('HOME', 'hero');
    const fieldKeys = heroFields.map(f => f.key);
    
    expect(fieldKeys).toContain('badge');
    expect(fieldKeys).toContain('title');
    expect(fieldKeys).toContain('description');
    expect(fieldKeys).toContain('primaryButtonText');
    expect(fieldKeys).toContain('primaryButtonUrl');
    expect(fieldKeys).toContain('secondaryButtonText');
    expect(fieldKeys).toContain('secondaryButtonUrl');
    expect(fieldKeys).toContain('bgImageMobile');
    expect(fieldKeys).toContain('bgImageDesktop');

    const titleField = heroFields.find(f => f.key === 'title');
    expect(titleField.type).toBe('multiline-text');
  });

  it('3. ABOUT displays editable hero fields and structured stats object-list', () => {
    const aboutMap = getContractRegions('ABOUT');
    const aboutRegions = Object.values(aboutMap);
    expect(aboutRegions.map(r => r.key)).toEqual([
      'hero', 'stats', 'mission', 'values', 'categories', 'cta'
    ]);

    const statsFields = getAllowedSlotFields('ABOUT', 'stats');
    const statsField = statsFields.find(f => f.key === 'items');
    expect(statsField.type).toBe('object-list');
    expect(statsField.itemFields.map(f => f.key)).toEqual(['value', 'label']);
  });

  it('4. CONTACT displays hero and form-copy fields', () => {
    const contactFields = getAllowedSlotFields('CONTACT', 'form');
    const fieldKeys = contactFields.map(f => f.key);
    
    expect(fieldKeys).toContain('channelTitle');
    expect(fieldKeys).toContain('channelDescription');
    expect(fieldKeys).toContain('formTitle');
    expect(fieldKeys).toContain('buttonText');
  });

  it('5. SERVICES displays hero and FAQ object-list fields', () => {
    const faqFields = getAllowedSlotFields('SERVICES', 'faq');
    const itemsField = faqFields.find(f => f.key === 'items');
    
    expect(itemsField.type).toBe('object-list');
    expect(itemsField.itemFields.map(f => f.key)).toEqual(['q', 'a']);
  });

  it('6. BLOGS displays hero and list-copy fields', () => {
    const blogsHeroFields = getAllowedSlotFields('BLOGS', 'hero');
    const fieldKeys = blogsHeroFields.map(f => f.key);
    
    expect(fieldKeys).toContain('title');
    expect(fieldKeys).toContain('description');
  });

  it('7. Repair creates missing PAGE_SECTION slots only (ignores ENTITY/SYSTEM/UNBOUND)', () => {
    const contactMap = getContractRegions('CONTACT');
    const pageSectionRegions = Object.values(contactMap).filter(r => r.source === 'PAGE_SECTION');
    
    expect(pageSectionRegions.map(r => r.key)).toEqual(['hero', 'form']);
  });

  it('8. Unknown template or region returns clear validation failure', () => {
    const invalidTemplate = validateContractContent('UNKNOWN_TEMPLATE', 'hero', { title: 'Test' });
    expect(invalidTemplate.unknownRegion).toBe(true);

    const invalidRegion = validateContractContent('HOME', 'unknown_region', { title: 'Test' });
    expect(invalidRegion.unknownRegion).toBe(true);
  });

  it('9. ENTITY, GLOBAL_SETTINGS, SYSTEM, and UNBOUND slots do not return PAGE_SECTION fields', () => {
    // HOME communityEvents is ENTITY source
    const eventsRegion = getContractRegion('HOME', 'communityEvents');
    expect(eventsRegion.source).toBe('ENTITY');
    expect(getAllowedSlotFields('HOME', 'communityEvents')).toEqual([]);

    // HOME servicesBanner is GLOBAL_SETTINGS source
    const bannerRegion = getContractRegion('HOME', 'servicesBanner');
    expect(bannerRegion.source).toBe('GLOBAL_SETTINGS');
    expect(getAllowedSlotFields('HOME', 'servicesBanner')).toEqual([]);
  });

  it('10. CMS_BUILT pages allow adding/deleting/reordering sections while CODE_TEMPLATE limits mutations', () => {
    const cmsCaps = getPageCapabilities({ pageType: 'CMS_BUILT', isHardcoded: false });
    expect(cmsCaps.canAddSections).toBe(true);
    expect(cmsCaps.canDeleteSections).toBe(true);
    expect(cmsCaps.canReorderSections).toBe(true);

    const codeCaps = getPageCapabilities({ pageType: 'CODE_TEMPLATE', isHardcoded: true });
    expect(codeCaps.canAddSections).toBe(false);
    expect(codeCaps.canDeleteSections).toBe(false);
    expect(codeCaps.canReorderSections).toBe(false);
    expect(codeCaps.canEditContent).toBe(true);
  });

  it('11. Dynamic patterns remain intentionally non-editable', () => {
    expect(isDynamicRoutePattern('/blogs/[slug]')).toBe(true);
    expect(isDynamicRoutePattern('/services/[slug]')).toBe(true);
    expect(isDynamicRoutePattern('/recipes/[id]')).toBe(true);
    
    // Static frontend routes must NOT be flagged as dynamic
    expect(isDynamicRoutePattern('/')).toBe(false);
    expect(isDynamicRoutePattern('/about')).toBe(false);
    expect(isDynamicRoutePattern('/contact')).toBe(false);
    expect(isDynamicRoutePattern('/services')).toBe(false);
    expect(isDynamicRoutePattern('/blogs')).toBe(false);
  });

  it('12. Validates canonical contract submission and rejects unknown submitted fields', () => {
    const validRes = validateContractContent('HOME', 'hero', {
      badge: 'New Eyebrow',
      title: 'Valid Title',
      description: 'Valid Description',
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.unknownFields).toEqual([]);

    const invalidRes = validateContractContent('HOME', 'hero', {
      badge: 'New Eyebrow',
      fake_unknown_field: 'Hacker payload',
    });
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.unknownFields).toContain('fake_unknown_field');
  });
});
