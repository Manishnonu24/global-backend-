// src/lib/sectionCanonicalizer.js
/**
 * Utility to canonicalize legacy section content into the new normalized shape.
 * Handles known legacy fields and maps them to the expected schema for each block type.
 * Preserves unknown fields, does not mutate input, does not delete legacy fields.
 */
export function canonicalize(type, content) {
  if (!content || typeof content !== "object") return content;
  const normalized = { ...content };

  const getFallback = (keys) => {
    for (const key of keys) {
      if (key.includes('.')) {
        const [obj, prop] = key.split('.');
        if (normalized[obj] && normalized[obj][prop] !== undefined) return normalized[obj][prop];
      } else {
        if (normalized[key] !== undefined) return normalized[key];
      }
    }
    return undefined;
  };

  const setIfMissing = (targetKey, fallbackKeys) => {
    if (normalized[targetKey] === undefined) {
      const val = getFallback(fallbackKeys);
      if (val !== undefined) normalized[targetKey] = val;
    }
  };

  // Canonical mappings
  setIfMissing('eyebrow', ['badge']);
  setIfMissing('backgroundImage', ['backgroundUrl', 'bannerUrl', 'heroImage']);
  
  setIfMissing('primaryButtonText', ['primaryButton.text']);
  setIfMissing('primaryButtonUrl', ['primaryButton.url']);
  
  setIfMissing('secondaryButtonText', ['secondaryButton.text']);
  setIfMissing('secondaryButtonUrl', ['secondaryButton.url']);
  
  setIfMissing('buttonText', ['ctaText', 'cta.text']);
  setIfMissing('buttonUrl', ['ctaUrl', 'cta.url']);
  
  setIfMissing('photo', ['avatarUrl']);
  
  // Assuming testimonial "content" maps to "quote" and "name" to "clientName"
  if (type === "TESTIMONIALS" || type === "TESTIMONIAL") {
    // If the section content directly contains name and content (or it's an array, but we are looking at top-level fields)
    setIfMissing('quote', ['content']);
    setIfMissing('clientName', ['name']);
  }

  return normalized;
}

/**
 * Convenience wrapper that canonicalizes and validates a section's content.
 */
export function canonicalizeSection(section) {
  const { type, content } = section;
  return {
    ...section,
    content: canonicalize(type, content),
  };
}
