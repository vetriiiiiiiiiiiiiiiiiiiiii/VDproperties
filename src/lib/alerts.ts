import "server-only";
import { db } from "./db";
import { sendListingAlert } from "./mail";
import { matchInclude, toMatchProperty } from "./platform";
import { criteriaSchema, matchProperties, normaliseWeights } from "./plotfit";
import { getSettings } from "./settings";

/** Called when a property is published for the first time. Only consenting customers with alerts on are notified. */
export async function alertSavedSearches(propertyId: string) {
  try {
    const row = await db.property.findUnique({ where: { id: propertyId }, include: matchInclude });
    if (!row || row.isSample) return;
    const searches = await db.savedSearch.findMany({ where: { alertsEnabled: true, user: { marketingConsent: true, active: true } }, include: { user: { select: { email: true } } } });
    if (!searches.length) return;
    const weights = normaliseWeights((await getSettings()).plotfitWeights);
    const property = toMatchProperty(row);
    for (const s of searches) {
      const criteria = criteriaSchema.safeParse(s.criteria);
      if (!criteria.success) continue;
      const res = matchProperties([property], criteria.data, weights);
      if (res.matches.length === 0) continue;
      if (await sendListingAlert(s.user.email, s.name, row.title, `/twin/${row.slug}`)) {
        await db.savedSearch.update({ where: { id: s.id }, data: { lastAlertAt: new Date() } });
      }
    }
  } catch (err) {
    console.error("Saved-search alerts failed", err);
  }
}
