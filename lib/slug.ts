/**
 * Derives `merchant_key` from a merchant name: lowercase, trimmed, diacritics
 * stripped, every run of non-alphanumeric characters collapsed to a single "-",
 * leading/trailing "-" removed. Returns null when there is no merchant or the
 * name has no usable characters.
 */
export function merchantSlug(name: string | null | undefined): string | null {
  if (name == null) return null;
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}
