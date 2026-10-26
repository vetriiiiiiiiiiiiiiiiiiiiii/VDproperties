/** Tamil (and future) content overlays stored as { ta: { field: value } } on content rows. */
export type Translations = Partial<Record<"ta", Record<string, unknown>>>;

const filled = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined);

/**
 * Replaces fields on every row (and nested row) that carries `translations` with that locale's
 * non-empty values. Anything not translated keeps its English value.
 */
export function overlay<T>(value: T, locale: string): T {
  if (locale === "en" || value === null || typeof value !== "object") return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map((v) => overlay(v, locale)) as T;
  const row = value as Record<string, unknown>;
  for (const k of Object.keys(row)) {
    const v = row[k];
    if (v && typeof v === "object" && !(v instanceof Date) && k !== "translations") row[k] = overlay(v, locale);
  }
  const tr = (row.translations as Translations | undefined)?.[locale as "ta"];
  if (tr && typeof tr === "object") for (const [k, v] of Object.entries(tr)) if (k in row && filled(v)) row[k] = v;
  return value;
}

/** Fields an editor can translate, per model. Lists (FAQs etc.) are stored as arrays. */
export const TRANSLATABLE = {
  property: ["title", "summary", "description", "localityLabel", "priceNote", "accessRoad", "developmentStatus", "utilities", "constructionSpecs", "approvalInfo", "siteConstraints"],
  project: ["name", "summary", "description", "highlights", "approvalInfo", "localityLabel"],
  settings: ["tagline", "businessHours", "aboutIntro", "aboutApproach", "aboutValues", "aboutServiceArea", "aboutCustomers", "registrationInfo", "constructionNotes", "privacyPolicy", "termsConditions"],
} as const;
