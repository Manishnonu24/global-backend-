import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isExplicitCmsPreview } from '../src/lib/cmsPreview';
import { GET as previewExitGet } from '../src/app/api/dashboard/pages/[pageId]/preview-exit/route';
import { GET as previewGet } from '../src/app/api/dashboard/pages/[pageId]/preview/route';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkSitePermission } from '@/lib/apiAuth';
import { pageService } from '@/services/page.service';
import { resolvePagePreviewPath } from '@/lib/routeClassification';
import { can } from '@/lib/pageCapabilities';

// Mock all external dependencies
vi.mock('next/headers', () => ({
  draftMode: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  checkSitePermission: vi.fn(),
}));

vi.mock('@/services/page.service', () => ({
  pageService: { getById: vi.fn() },
}));

vi.mock('@/lib/routeClassification', () => ({
  resolvePagePreviewPath: vi.fn(),
}));

vi.mock('@/lib/pageCapabilities', () => ({
  can: vi.fn(),
}));

vi.mock('next/dist/client/components/redirect', () => ({
  isRedirectError: vi.fn(() => false),
}));

describe('Global Backend preview Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isExplicitCmsPreview', () => {
    it('returns true when draft cookie is enabled and marker is present (string)', async () => {
      draftMode.mockResolvedValueOnce({ isEnabled: true });
      const result = await isExplicitCmsPreview({ cmsPreview: '1' });
      expect(result).toBe(true);
    });

    it('returns true when draft cookie is enabled and marker is present (array)', async () => {
      draftMode.mockResolvedValueOnce({ isEnabled: true });
      const result = await isExplicitCmsPreview({ cmsPreview: ['1'] });
      expect(result).toBe(true);
    });

    it('returns false when draft cookie is enabled but marker is missing', async () => {
      draftMode.mockResolvedValueOnce({ isEnabled: true });
      const result = await isExplicitCmsPreview({});
      expect(result).toBe(false);
    });

    it('returns false when draft cookie is disabled but marker is present', async () => {
      draftMode.mockResolvedValueOnce({ isEnabled: false });
      const result = await isExplicitCmsPreview({ cmsPreview: '1' });
      expect(result).toBe(false);
    });

    it('returns false when draft cookie is disabled and marker is missing', async () => {
      draftMode.mockResolvedValueOnce({ isEnabled: false });
      const result = await isExplicitCmsPreview({});
      expect(result).toBe(false);
    });
  });

  describe('preview endpoint', () => {
    it('creates a URL containing cmsPreview=1 and preserves existing parameters', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      pageService.getById.mockResolvedValueOnce({ id: 'page1', slug: '/about' });
      can.mockReturnValueOnce(true);
      const enableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ enable: enableMock });
      
      resolvePagePreviewPath.mockReturnValueOnce('/about?foo=bar');
      
      const req = { url: 'http://localhost:3000/api/preview' };
      const params = { pageId: 'page1' };

      await previewGet(req, { params: Promise.resolve(params) });

      expect(enableMock).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/about?foo=bar&cmsPreview=1');
    });

    it('blocks previewing unresolved dynamic patterns', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      pageService.getById.mockResolvedValueOnce({ id: 'page1', slug: '/blogs/[slug]' });
      can.mockReturnValueOnce(true);
      
      resolvePagePreviewPath.mockReturnValueOnce(null);
      const enableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ enable: enableMock });
      
      const req = { url: 'http://localhost:3000/api/preview' };
      const params = { pageId: 'page1' };

      const res = await previewGet(req, { params: Promise.resolve(params) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('unresolved dynamic route');
    });
  });

  describe('preview-exit endpoint', () => {
    it('disables Draft Mode and removes the marker from returnTo', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      const disableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ disable: disableMock });
      
      const req = { url: 'http://localhost:3000/api/preview-exit?returnTo=/about?cmsPreview=1' };
      const params = { pageId: '0' };

      await previewExitGet(req, { params: Promise.resolve(params) });

      expect(disableMock).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/about');
    });

    it('rejects external returnTo values', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      const disableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ disable: disableMock });
      
      const req = { url: 'http://localhost:3000/api/preview-exit?returnTo=https://evil.com' };
      const params = { pageId: '0' };

      await previewExitGet(req, { params: Promise.resolve(params) });
      expect(redirect).toHaveBeenCalledWith('/'); 
    });

    it('rejects protocol-relative returnTo values', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      const disableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ disable: disableMock });
      
      const req = { url: 'http://localhost:3000/api/preview-exit?returnTo=//evil.com' };
      const params = { pageId: '0' };

      await previewExitGet(req, { params: Promise.resolve(params) });
      expect(redirect).toHaveBeenCalledWith('/'); 
    });
    
    it('preserves existing query parameters on returnTo (minus cmsPreview)', async () => {
      checkSitePermission.mockResolvedValueOnce({ siteId: 'test' });
      const disableMock = vi.fn();
      draftMode.mockResolvedValueOnce({ disable: disableMock });
      
      const req = { url: 'http://localhost:3000/api/preview-exit?returnTo=/about?foo=bar%26cmsPreview=1' };
      const params = { pageId: '0' };

      await previewExitGet(req, { params: Promise.resolve(params) });
      expect(redirect).toHaveBeenCalledWith('/about?foo=bar');
    });
  });
});
