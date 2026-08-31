import {
  getContractRegions,
  readField,
} from "@/content-contracts/pageContracts";

function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}

/**
 * Resolves page section content for a templateKey against stored database sections.
 * Uses readField from pageContracts to ensure canonical keys, legacyAliases,
 * false/0 values, empty strings/arrays, and defaults are handled safely.
 */
export function resolvePageContent(templateKey, sections = []) {
  const regions = getContractRegions(templateKey) || {};
  const sectionList = Array.isArray(sections) ? sections : [];
  const resolved = {};

  for (const [regionKey, regionDef] of Object.entries(regions)) {
    if (regionDef.source !== "PAGE_SECTION") continue;

    const section = sectionList.find(
      (item) => item?.regionKey === regionKey
    );

    const storedContent =
      section?.content &&
      typeof section.content === "object" &&
      !Array.isArray(section.content)
        ? section.content
        : {};

    resolved[regionKey] = {};

    for (const fieldDef of regionDef.fields || []) {
      resolved[regionKey][fieldDef.key] = cloneValue(
        readField(storedContent, fieldDef)
      );
    }
  }

  return resolved;
}
