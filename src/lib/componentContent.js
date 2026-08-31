import prisma from "./prisma";

export async function getComponentContent(siteId, pageSlug, componentKey, defaultContent) {
  try {
    const record = await prisma.componentContent.findUnique({
      where: {
        siteId_pageSlug_componentKey: {
          siteId,
          pageSlug,
          componentKey,
        },
      },
    });

    if (!record || !record.data) {
      return defaultContent;
    }

    // Deep merge saved data over default content
    return { ...defaultContent, ...record.data };
  } catch (error) {
    console.error(`[getComponentContent] Error fetching ${componentKey}:`, error);
    return defaultContent;
  }
}

export async function saveComponentContent(siteId, pageSlug, componentKey, data) {
  return await prisma.componentContent.upsert({
    where: {
      siteId_pageSlug_componentKey: {
        siteId,
        pageSlug,
        componentKey,
      },
    },
    update: {
      data,
    },
    create: {
      siteId,
      pageSlug,
      componentKey,
      data,
    },
  });
}
