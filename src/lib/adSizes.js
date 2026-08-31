/**
 * Shared Ad Specifications & Banner Size Constants
 */

export const BANNER_ZONE_SIZES = [
  // Top 5 highest-performing / Google-standard banner sizes
  { label: 'Medium Rectangle (300×250)', width: 300, height: 250 },
  { label: 'Leaderboard (728×90)', width: 728, height: 90 },
  { label: 'Half-Page Ad (300×600)', width: 300, height: 600 },
  { label: 'Large Rectangle (336×280)', width: 336, height: 280 },
  { label: 'Mobile Banner (320×50)', width: 320, height: 50 },

  // Extra standard sizes from REQUIRED_ZONES
  { label: 'Large Leaderboard (970×90)', width: 970, height: 90 },
  { label: 'Billboard (970×250)', width: 970, height: 250 },
  { label: 'Wide Skyscraper (160×600)', width: 160, height: 600 },
  { label: 'Large Mobile Banner (320×100)', width: 320, height: 100 },
];

export const RESPONSIVE_IMAGE_SPECS = [
  { label: 'Landscape (Recommended 1200×628)', width: 1200, height: 628, ratio: '1.91:1', ratioValue: 1.91, maxSizeKB: 5000 },
  { label: 'Square (Recommended 1200×1200)', width: 1200, height: 1200, ratio: '1:1', ratioValue: 1.0, maxSizeKB: 5000 },
  { label: 'Portrait (Recommended 960×1200)', width: 960, height: 1200, ratio: '4:5', ratioValue: 0.8, maxSizeKB: 5000 },
];

export const STATIC_BANNER_MAX_KB = 150;

/**
 * Helper to check if a size (width, height) matches any standard BANNER_ZONE_SIZES
 */
export function isStandardBannerSize(width, height) {
  const w = Number(width);
  const h = Number(height);
  return BANNER_ZONE_SIZES.some((s) => s.width === w && s.height === h);
}

/**
 * Advisory check for image file / asset properties.
 * Returns an array of warning string messages (if any).
 */
export function getAdImageWarnings(fileSizeBytes, imgWidth = null, imgHeight = null) {
  const warnings = [];

  if (fileSizeBytes && fileSizeBytes > STATIC_BANNER_MAX_KB * 1024) {
    const sizeKB = Math.round(fileSizeBytes / 1024);
    warnings.push(
      `File size (${sizeKB} KB) exceeds the recommended limit of ${STATIC_BANNER_MAX_KB} KB for optimal page load speed.`
    );
  }

  if (imgWidth && imgHeight) {
    const ratio = imgWidth / imgHeight;
    const matchesRatio = RESPONSIVE_IMAGE_SPECS.some((spec) => {
      return Math.abs(ratio - spec.ratioValue) < 0.1;
    });

    if (!matchesRatio) {
      warnings.push(
        `Image aspect ratio (${imgWidth}×${imgHeight}) does not match recommended specs (1.91:1 Landscape, 1:1 Square, or 4:5 Portrait). Image will be automatically cropped with object-fit: cover.`
      );
    }
  }

  return warnings;
}
