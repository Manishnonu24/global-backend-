export function parseSeoKeywords(value) {
  if (!value) return undefined;

  const keywords = String(value)
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return keywords.length ? keywords : undefined;
}
