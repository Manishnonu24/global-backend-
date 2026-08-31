import prisma from "./prisma";

export function deepMerge(target, source) {
  if (
    typeof target !== "object" ||
    target === null ||
    typeof source !== "object" ||
    source === null
  ) {
    return source === undefined ? target : source;
  }
  if (Array.isArray(target) || Array.isArray(source)) {
    return source !== undefined ? source : target;
  }
  const merged = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object" &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        merged[key] = deepMerge(target[key], source[key]);
      } else {
        merged[key] = source[key];
      }
    }
  }
  return merged;
}

export async function getPageContent(siteId, pageSlug, defaultContent) {
  // PageContent is deprecated in favor of standard sections
  return defaultContent;
}

export async function savePageContent(siteId, pageSlug, data) {
  // PageContent is deprecated in favor of standard sections
  console.warn("savePageContent called but PageContent is deprecated.");
  return null;
}
