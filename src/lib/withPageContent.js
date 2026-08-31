import { getPageContent } from './pageContent';
import { getDefaultSiteId } from './siteResolver';

export async function withPageContent(pageSlug, defaultContent) {
  try {
    const siteId = getDefaultSiteId();
    return await getPageContent(siteId, pageSlug, defaultContent);
  } catch (error) {
    console.error(`Error loading page content for ${pageSlug}:`, error);
    return defaultContent;
  }
}
