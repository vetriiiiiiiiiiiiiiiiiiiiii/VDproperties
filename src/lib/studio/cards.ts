import { findCostCard } from "../platform";

export async function cardsFor(locationId: string | null) {
  const [BASIC, STANDARD, PREMIUM] = await Promise.all([findCostCard("BASIC", locationId), findCostCard("STANDARD", locationId), findCostCard("PREMIUM", locationId)]);
  return { BASIC, STANDARD, PREMIUM };
}
