/** Convert a snake_case or verbose DB pricing-type string into a short human-readable label. */
export function formatPricingType(value: string | null | undefined): string {
  if (!value) return "—";

  const v = value.trim();

  if (/^a[_\s]la[_\s]carte/i.test(v) || v === "A La Carte Pricing") return "A La Carte";
  if (/^per[_\s]person/i.test(v)) return "Per Person";
  if (/^package/i.test(v)) return "Package";

  // Generic fallback: replace underscores with spaces, then title-case each word
  return v
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
